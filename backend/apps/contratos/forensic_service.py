import time
import uuid
from datetime import date, datetime
from typing import Any, Dict, Optional

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.core.canonical_json import (
    GENESIS_HASH,
    EMPTY_PAYLOAD_HASH,
    _normalize_canonical_value,
    calculate_current_hash,
    sha256_canonical_json,
)
from apps.contratos.models import (
    AuditDailySeal,
    Contrato,
    ContratoAuditLog,
    ForensicAuditLog,
    NivelRelevanciaAudit,
)
from apps.clientes.models import Cliente, ClienteAuditLog, TipoEventoClienteAudit


class ForensicAuditService:
    """
    Serviço central de Governança e Auditoria Forense Digital (RN-10 a RN-16).
    Orquestra o encadeamento criptográfico SHA-256 (Hash Chaining) particionado,
    garante a imutabilidade pericial, valida justificativas obrigatórias de Nível 1
    e assegura a escrita dupla retrocompatível nos modelos legados.
    """

    @classmethod
    def validar_justificativa_n1(cls, nivel_relevancia: str, justificativa: Optional[str]) -> None:
        """
        Valida que ações periciais de Nível 1 (Críticas) possuem justificativa
        mandatória não nula com no mínimo 10 caracteres significativos (RN-12).
        """
        if nivel_relevancia == NivelRelevanciaAudit.N1:
            if not justificativa or len(justificativa.strip()) < 10:
                raise ValidationError(
                    "Operações de Nível 1 (Críticas) exigem justificativa mandatória com no mínimo 10 caracteres."
                )

    @classmethod
    def resolver_particao(
        cls,
        particao: Optional[str] = None,
        contrato: Optional[Contrato] = None,
        cliente: Optional[Cliente] = None,
    ) -> str:
        """Resolve a partição do ledger pericial."""
        if particao:
            return particao
        if contrato:
            return f"contrato:{contrato.id}"
        if cliente:
            return f"cliente:{cliente.id}"
        return "global"

    @classmethod
    def registrar_evento(
        cls,
        tipo_evento: str,
        descricao: str,
        nivel_relevancia: str = NivelRelevanciaAudit.N1,
        contrato: Optional[Contrato] = None,
        cliente: Optional[Cliente] = None,
        usuario: Any = None,
        usuario_nome: Optional[str] = None,
        usuario_email: Optional[str] = None,
        usuario_role: Optional[str] = None,
        justificativa: Optional[str] = None,
        dados_payload: Optional[Dict[str, Any]] = None,
        ip_origem: Optional[str] = None,
        user_agent: Optional[str] = None,
        particao: Optional[str] = None,
        documento_nome: Optional[str] = None,
        documento_hash: Optional[str] = None,
    ) -> ForensicAuditLog:
        """
        Registra um evento pericial imutável com encadeamento determinístico de hash.
        Executado compulsoriamente dentro de transação ACID com bloqueio pessimista
        por partição para prevenir desvios de concorrência.
        """
        # 1. Validação de Justificativa N1
        cls.validar_justificativa_n1(nivel_relevancia, justificativa)

        # 2. Resolução da Partição
        particao_final = cls.resolver_particao(particao, contrato, cliente)

        # 3. Metadados do Operador
        nome_op = usuario_nome
        email_op = usuario_email
        role_op = usuario_role
        user_obj = None

        if usuario and getattr(usuario, "is_authenticated", False):
            user_obj = usuario
            if not nome_op:
                nome_op = usuario.get_full_name() or usuario.username
            if not email_op:
                email_op = usuario.email
            if not role_op and hasattr(usuario, "role"):
                role_op = usuario.role

        payload_dict = _normalize_canonical_value(dados_payload or {})
        payload_hash = sha256_canonical_json(payload_dict)

        with transaction.atomic():
            # 4. Bloqueio determinístico do último elo da partição
            ultimo_elo = (
                ForensicAuditLog.objects.select_for_update()
                .filter(particao=particao_final)
                .order_by("-sequencia")
                .first()
            )

            if ultimo_elo:
                previous_hash = ultimo_elo.current_hash
                sequencia = ultimo_elo.sequencia + 1
            else:
                previous_hash = GENESIS_HASH
                sequencia = 1

            # 5. Timestamp e cálculo da dispersão criptográfica
            agora = timezone.now()
            ts_iso = agora.isoformat()
            user_id = user_obj.id if user_obj else None

            current_hash = calculate_current_hash(
                previous_hash=previous_hash,
                sequencia=sequencia,
                timestamp_iso=ts_iso,
                usuario_id=user_id,
                tipo_evento=tipo_evento,
                payload_hash=payload_hash,
            )

            # 6. Gravação no modelo pericial de autoridade ForensicAuditLog
            forensic_log = ForensicAuditLog(
                particao=particao_final,
                contrato=contrato,
                cliente=cliente,
                sequencia=sequencia,
                tipo_evento=tipo_evento,
                nivel_relevancia=nivel_relevancia,
                descricao=descricao,
                justificativa=justificativa,
                usuario=user_obj,
                usuario_nome=nome_op,
                usuario_email=email_op,
                usuario_role=role_op,
                ip_origem=ip_origem,
                user_agent=user_agent,
                dados_payload=payload_dict,
                payload_hash=payload_hash,
                previous_hash=previous_hash,
                current_hash=current_hash,
            )
            # Define o timestamp para garantir que save() persista exatamente o carimbo usado no hash
            forensic_log.timestamp = agora
            forensic_log.save()

            # 7. Escrita Dupla Reflexa de Transição (RN-15)
            if contrato:
                ContratoAuditLog.objects.create(
                    contrato=contrato,
                    tipo_evento=tipo_evento[:40],
                    descricao=descricao,
                    justificativa=justificativa,
                    documento_nome=documento_nome,
                    documento_hash=documento_hash,
                    usuario=user_obj,
                    ip_origem=ip_origem,
                    user_agent=user_agent or "",
                )

            if cliente:
                tipo_cli = TipoEventoClienteAudit.ALTERACAO
                if hasattr(TipoEventoClienteAudit, tipo_evento):
                    tipo_cli = getattr(TipoEventoClienteAudit, tipo_evento)
                elif "EXCLUSAO" in tipo_evento:
                    tipo_cli = TipoEventoClienteAudit.EXCLUSAO
                elif "CRIACAO" in tipo_evento:
                    tipo_cli = TipoEventoClienteAudit.CRIACAO

                nome_cliente = cliente.nome_fantasia or cliente.razao_social or getattr(cliente, "nome_completo", None) or str(cliente)
                ClienteAuditLog.objects.create(
                    cliente_id=cliente.id,
                    cliente_nome=nome_cliente,
                    cliente_documento=getattr(cliente, "cnpj", None) or getattr(cliente, "cpf", None),
                    tipo_evento=tipo_cli,
                    descricao=descricao,
                    justificativa=justificativa,
                    usuario=user_obj,
                    usuario_nome=nome_op or "Sistema",
                    usuario_email=email_op or "",
                    usuario_role=role_op or "",
                    ip_origem=ip_origem,
                    user_agent=user_agent or "",
                )

        return forensic_log

    @classmethod
    def verificar_integridade_particao(cls, particao: str) -> Dict[str, Any]:
        """
        Percorre toda a corrente de registros de uma partição, desde o bloco gênese
        até o último registro, recalculando e verificando:
        1. Encadeamento contínuo de previous_hash
        2. Dispersão canônica do payload_hash
        3. Dispersão pericial do current_hash
        """
        inicio = time.perf_counter()
        registros = ForensicAuditLog.objects.filter(particao=particao).order_by("sequencia")
        total = registros.count()

        if total == 0:
            return {
                "status": "integro",
                "particao": particao,
                "total_registros_verificados": 0,
                "tempo_verificacao_ms": round((time.perf_counter() - inicio) * 1000, 2),
                "ultimo_hash": None,
                "mensagem": "Partição sem registros periciais. Integridade preservada por vacuidade.",
                "verificado_em": timezone.now().isoformat(),
            }

        expected_prev = GENESIS_HASH

        for log in registros.iterator():
            # 1. Checagem do previous_hash
            if log.previous_hash != expected_prev:
                return {
                    "status": "rompido",
                    "particao": particao,
                    "registro_falha_sequencia": log.sequencia,
                    "registro_falha_id": str(log.id),
                    "hash_calculado": expected_prev,
                    "hash_armazenado": log.previous_hash,
                    "mensagem": (
                        f"Alerta de fraude: O registro de sequência #{log.sequencia} possui previous_hash "
                        f"incompatível com o hash do registro anterior. A cadeia pericial foi violada."
                    ),
                    "verificado_em": timezone.now().isoformat(),
                }

            # 2. Checagem da canonicidade e hash do payload
            calc_payload_hash = sha256_canonical_json(log.dados_payload)
            if calc_payload_hash != log.payload_hash:
                return {
                    "status": "rompido",
                    "particao": particao,
                    "registro_falha_sequencia": log.sequencia,
                    "registro_falha_id": str(log.id),
                    "hash_calculado": calc_payload_hash,
                    "hash_armazenado": log.payload_hash,
                    "mensagem": (
                        f"Alerta de fraude: O registro de sequência #{log.sequencia} teve sua carga útil adulterada. "
                        f"O payload_hash diverge da dispersão canônica RFC 8785."
                    ),
                    "verificado_em": timezone.now().isoformat(),
                }

            # 3. Checagem da dispersão atual (current_hash)
            calc_current_hash = calculate_current_hash(
                previous_hash=log.previous_hash,
                sequencia=log.sequencia,
                timestamp_iso=log.timestamp.isoformat(),
                usuario_id=log.usuario_id,
                tipo_evento=log.tipo_evento,
                payload_hash=log.payload_hash,
            )

            if calc_current_hash != log.current_hash:
                return {
                    "status": "rompido",
                    "particao": particao,
                    "registro_falha_sequencia": log.sequencia,
                    "registro_falha_id": str(log.id),
                    "hash_calculado": calc_current_hash,
                    "hash_armazenado": log.current_hash,
                    "mensagem": (
                        f"Alerta de fraude: O registro de sequência #{log.sequencia} possui divergência matemática "
                        f"de dispersão. A cadeia pericial foi violada."
                    ),
                    "verificado_em": timezone.now().isoformat(),
                }

            expected_prev = log.current_hash

        duracao_ms = round((time.perf_counter() - inicio) * 1000, 2)
        return {
            "status": "integro",
            "particao": particao,
            "total_registros_verificados": total,
            "tempo_verificacao_ms": duracao_ms,
            "ultimo_hash": expected_prev,
            "mensagem": "Trilha pericial 100% íntegra. Nenhuma violação matemática detectada.",
            "verificado_em": timezone.now().isoformat(),
        }

    @classmethod
    def selar_particao_diaria(cls, particao: str, data_referencia: Optional[date] = None) -> Optional[AuditDailySeal]:
        """
        Lavra o selo pericial diário (Daily Seal) consolidando os eventos da partição
        até o final do dia de referência (RN-16).
        """
        ref_date = data_referencia or timezone.localdate()
        ultimo_registro = (
            ForensicAuditLog.objects.filter(particao=particao, timestamp__date__lte=ref_date)
            .order_by("-sequencia")
            .first()
        )

        if not ultimo_registro:
            return None

        total_eventos = ForensicAuditLog.objects.filter(
            particao=particao, timestamp__date=ref_date
        ).count()

        # Digest do selo combinando partição, data, última sequência e último hash
        raw_seal = f"{particao}|{ref_date.isoformat()}|{ultimo_registro.sequencia}|{ultimo_registro.current_hash}|{total_eventos}"
        from hashlib import sha256
        seal_digest = sha256(raw_seal.encode("utf-8")).hexdigest()

        seal, _ = AuditDailySeal.objects.update_or_create(
            data_referencia=ref_date,
            particao=particao,
            defaults={
                "ultimo_registro_id": ultimo_registro.id,
                "ultima_sequencia": ultimo_registro.sequencia,
                "ultimo_hash": ultimo_registro.current_hash,
                "total_eventos_dia": total_eventos,
                "selo_digest": seal_digest,
            },
        )
        return seal
