from datetime import date, timedelta
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from apps.contratos.models import Contrato, StatusContrato, TipoContrato, AceiteLink

class ContratoService:
    @staticmethod
    def gerar_numero(ano=None) -> str:
        import re
        ano = ano or timezone.localdate().year
        prefixo = f"CT-{ano}-"
        numeros = Contrato.objects.filter(numero__startswith=prefixo).values_list("numero", flat=True)
        max_seq = 0
        pattern = re.compile(rf"^{re.escape(prefixo)}(\d+)$")
        for num_str in numeros:
            match = pattern.match(num_str)
            if match:
                try:
                    num = int(match.group(1))
                    if num > max_seq:
                        max_seq = num
                except ValueError:
                    continue
        seq = max_seq + 1
        candidato = f"{prefixo}{seq:04d}"
        while Contrato.objects.filter(numero=candidato).exists():
            seq += 1
            candidato = f"{prefixo}{seq:04d}"
        return candidato

    @staticmethod
    @transaction.atomic
    def criar_contrato(dados, usuario) -> Contrato:
        numero = ContratoService.gerar_numero()
        horas = Decimal(str(dados.get("horas_contratadas", "0.00")))
        saldo_inicial = horas

        contrato = Contrato.objects.create(
            numero=numero,
            tipo=dados.get("tipo", TipoContrato.NOVO),
            contrato_referencia_id=dados.get("contrato_referencia"),
            cliente_id=dados.get("cliente"),
            data_inicio=dados.get("data_inicio"),
            data_termino=dados.get("data_termino"),
            horas_contratadas=horas,
            saldo=saldo_inicial,
            descricao_servicos=dados.get("descricao_servicos", ""),
            valor_mensal=dados.get("valor_mensal"),
            observacoes=dados.get("observacoes", ""),
            status=StatusContrato.PENDENTE_ACEITE,
            criado_por=usuario,
        )

        AceiteLink.objects.create(
            contrato=contrato,
            data_expiracao=timezone.now() + timedelta(days=30),
        )
        return contrato