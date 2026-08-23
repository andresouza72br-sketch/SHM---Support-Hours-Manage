from decimal import Decimal
from typing import Any

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone

from shm.models.clients import Cliente
from shm.models.contracts import Contrato
from shm.models.requests import Ciclo, Pedido, Tarefa
from shm.models.timeline import ComentarioTimeline
from shm.models.users import Usuario

from .contract_service import ContractService
from .timeline_service import TimelineService


class WorkflowService:
    @staticmethod
    def criar_pedido(
        cliente: Cliente,
        contrato: Contrato,
        solicitante: Usuario,
        titulo: str,
        descricao_geral: str,
    ) -> Pedido:
        """Cria um novo Pedido de Suporte associado ao contrato ativo."""
        if solicitante.is_cliente and solicitante.cliente_id != cliente.id:
            raise PermissionDenied("O solicitante não pertence ao cliente informado.")

        # Gera código incremental simples
        total_pedidos = Pedido.objects.filter(cliente=cliente).count() + 1
        codigo = f"PED-{timezone.now().year}-{total_pedidos:04d}"

        pedido = Pedido.objects.create(
            codigo=codigo,
            cliente=cliente,
            contrato=contrato,
            solicitante=solicitante,
            titulo=titulo,
            descricao_geral=descricao_geral,
            status=Pedido.Status.ABERTO,
        )

        TimelineService.registrar_evento(
            conteudo=f"Pedido {pedido.codigo} aberto por {solicitante.nome_completo}: '{titulo}'.",
            tipo_evento=ComentarioTimeline.TipoEvento.SISTEMA,
            pedido=pedido,
            autor=solicitante,
        )

        return pedido

    @staticmethod
    @transaction.atomic
    def decompor_pedido_em_ciclo(
        pedido: Pedido,
        usuario: Usuario,
        titulo_contexto: str,
        tipo_manutencao: str,
        descricao_escopo: str,
        tarefas_data: list[dict[str, Any]] | None = None,
    ) -> Ciclo:
        """Permite à Empresa decompor um pedido em ciclos com escopo e tarefas estimadas."""
        if not usuario.is_empresa:
            raise PermissionDenied(
                "Apenas operadores da Empresa Prestadora podem decompor pedidos em ciclos."
            )

        total_ciclos = pedido.ciclos.count() + 1
        codigo = f"{pedido.codigo}-C{total_ciclos:02d}"

        ciclo = Ciclo.objects.create(
            pedido=pedido,
            codigo=codigo,
            titulo_contexto=titulo_contexto,
            tipo_manutencao=tipo_manutencao,
            descricao_escopo=descricao_escopo,
            status=Ciclo.Status.CRIADO,
        )

        if tarefas_data:
            for t in tarefas_data:
                Tarefa.objects.create(
                    ciclo=ciclo,
                    descricao=t["descricao"],
                    responsavel_tecnico=t.get("responsavel_tecnico"),
                    horas_estimadas=Decimal(str(t.get("horas_estimadas", "0.00"))),
                )
            ciclo.recalcular_totais()

        # Atualiza status do pedido para EM_ANALISE se estava ABERTO
        if pedido.status == Pedido.Status.ABERTO:
            pedido.status = Pedido.Status.EM_ANALISE
            pedido.save(update_fields=["status", "updated_at"])

        TimelineService.registrar_evento(
            conteudo=f"Ciclo {ciclo.codigo} ({ciclo.get_tipo_manutencao_display()}) criado com {ciclo.horas_estimadas_total:.2f}h estimadas.",
            tipo_evento=ComentarioTimeline.TipoEvento.MUDANCA_STATUS,
            pedido=pedido,
            ciclo=ciclo,
            autor=usuario,
            horas_contexto=ciclo.horas_estimadas_total,
        )

        return ciclo

    @staticmethod
    def enviar_orcamento(ciclo: Ciclo, usuario: Usuario) -> Ciclo:
        """Envia o orçamento do ciclo para avaliação do Cliente."""
        if not usuario.is_empresa:
            raise PermissionDenied(
                "Apenas a Empresa Prestadora pode submeter orçamentos."
            )

        ciclo.recalcular_totais()
        if ciclo.horas_estimadas_total <= Decimal("0.00"):
            raise ValidationError(
                "O ciclo precisa ter ao menos uma tarefa com horas estimadas maiores que zero."
            )

        ciclo.status = Ciclo.Status.AGUARDANDO_APROVACAO
        ciclo.save(update_fields=["status", "updated_at"])

        ciclo.pedido.status = Pedido.Status.AGUARDANDO_APROVACAO
        ciclo.pedido.save(update_fields=["status", "updated_at"])

        TimelineService.registrar_evento(
            conteudo=f"Orçamento do ciclo {ciclo.codigo} submetido para aprovação do cliente. Total estimado: {ciclo.horas_estimadas_total:.2f}h.",
            tipo_evento=ComentarioTimeline.TipoEvento.MUDANCA_STATUS,
            ciclo=ciclo,
            autor=usuario,
            horas_contexto=ciclo.horas_estimadas_total,
        )

        return ciclo

    @staticmethod
    def aprovar_orcamento(ciclo: Ciclo, usuario: Usuario) -> Ciclo:
        """Gestor do Cliente aprova o orçamento do ciclo."""
        if usuario.tipo_perfil != Usuario.TipoPerfil.GESTOR_CLIENTE:
            raise PermissionDenied(
                "Apenas o Gestor do Cliente pode aprovar orçamentos."
            )

        if usuario.cliente_id != ciclo.pedido.cliente_id:
            raise PermissionDenied("Usuário não pertence ao cliente vinculado.")

        if ciclo.status != Ciclo.Status.AGUARDANDO_APROVACAO:
            raise ValidationError("O ciclo não está aguardando aprovação.")

        ciclo.status = Ciclo.Status.APROVADO
        ciclo.aprovado_por = usuario
        ciclo.aprovado_em = timezone.now()
        ciclo.save(
            update_fields=["status", "aprovado_por", "aprovado_em", "updated_at"]
        )

        TimelineService.registrar_evento(
            conteudo=f"Orçamento do ciclo {ciclo.codigo} ({ciclo.horas_estimadas_total:.2f}h) APROVADO por {usuario.nome_completo}.",
            tipo_evento=ComentarioTimeline.TipoEvento.APROVACAO,
            ciclo=ciclo,
            autor=usuario,
            horas_contexto=ciclo.horas_estimadas_total,
        )

        return ciclo

    @staticmethod
    def rejeitar_orcamento(ciclo: Ciclo, usuario: Usuario, motivo: str) -> Ciclo:
        """Gestor do Cliente rejeita o orçamento informando o motivo."""
        if usuario.tipo_perfil != Usuario.TipoPerfil.GESTOR_CLIENTE:
            raise PermissionDenied(
                "Apenas o Gestor do Cliente pode rejeitar orçamentos."
            )

        if usuario.cliente_id != ciclo.pedido.cliente_id:
            raise PermissionDenied("Usuário não pertence ao cliente vinculado.")

        if not motivo.strip():
            raise ValidationError("O motivo da rejeição é obrigatório.")

        ciclo.status = Ciclo.Status.REJEITADO
        ciclo.motivo_rejeicao = motivo
        ciclo.save(update_fields=["status", "motivo_rejeicao", "updated_at"])

        TimelineService.registrar_evento(
            conteudo=f"Orçamento do ciclo {ciclo.codigo} REJEITADO por {usuario.nome_completo}. Motivo: '{motivo}'.",
            tipo_evento=ComentarioTimeline.TipoEvento.REJEICAO,
            ciclo=ciclo,
            autor=usuario,
        )

        return ciclo

    @staticmethod
    def iniciar_execucao_ciclo(ciclo: Ciclo, usuario: Usuario) -> Ciclo:
        """Inicia a execução técnica do ciclo aprovado."""
        if not usuario.is_empresa:
            raise PermissionDenied(
                "Apenas operadores da Empresa podem iniciar a execução."
            )

        if ciclo.status != Ciclo.Status.APROVADO:
            raise ValidationError(
                "O ciclo precisa estar Aprovado pelo Cliente para iniciar a execução."
            )

        ciclo.status = Ciclo.Status.EM_EXECUCAO
        ciclo.save(update_fields=["status", "updated_at"])

        ciclo.pedido.status = Pedido.Status.EM_EXECUCAO
        ciclo.pedido.save(update_fields=["status", "updated_at"])

        TimelineService.registrar_evento(
            conteudo=f"Execução técnica do ciclo {ciclo.codigo} iniciada por {usuario.nome_completo}.",
            tipo_evento=ComentarioTimeline.TipoEvento.MUDANCA_STATUS,
            ciclo=ciclo,
            autor=usuario,
        )

        return ciclo

    @staticmethod
    def apontar_horas_tarefa(
        tarefa: Tarefa,
        usuario: Usuario,
        horas_realizadas: Decimal,
        concluida: bool = False,
    ) -> Tarefa:
        """Técnico lança horas realizadas na tarefa."""
        if not usuario.is_empresa:
            raise PermissionDenied(
                "Apenas técnicos ou gestores da Empresa podem lançar horas em tarefas."
            )

        tarefa.horas_realizadas = horas_realizadas
        tarefa.concluida = concluida
        tarefa.responsavel_tecnico = usuario
        tarefa.save(
            update_fields=[
                "horas_realizadas",
                "concluida",
                "responsavel_tecnico",
                "updated_at",
            ]
        )

        tarefa.ciclo.recalcular_totais()

        TimelineService.registrar_evento(
            conteudo=f"Apontamento na tarefa '{tarefa.descricao}': {horas_realizadas:.2f}h realizadas (Concluída: {'Sim' if concluida else 'Não'}).",
            tipo_evento=ComentarioTimeline.TipoEvento.AJUSTE_HORAS,
            ciclo=tarefa.ciclo,
            autor=usuario,
            horas_contexto=horas_realizadas,
        )

        return tarefa

    @staticmethod
    def solicitar_aceite_ciclo(ciclo: Ciclo, usuario: Usuario) -> Ciclo:
        """Submete o ciclo para aceite formal do cliente."""
        if not usuario.is_empresa:
            raise PermissionDenied(
                "Apenas a Empresa Prestadora pode submeter ciclo para aceite."
            )

        ciclo.recalcular_totais()
        ciclo.status = Ciclo.Status.AGUARDANDO_ACEITE
        ciclo.save(update_fields=["status", "updated_at"])

        TimelineService.registrar_evento(
            conteudo=f"Tarefas do ciclo {ciclo.codigo} finalizadas. Solicitado Aceite Final do Cliente. Total realizado: {ciclo.horas_realizadas_total:.2f}h.",
            tipo_evento=ComentarioTimeline.TipoEvento.SOLICITACAO_ACEITE,
            ciclo=ciclo,
            autor=usuario,
            horas_contexto=ciclo.horas_realizadas_total,
        )

        return ciclo

    @staticmethod
    def dar_aceite_ciclo(ciclo: Ciclo, usuario: Usuario) -> Ciclo:
        """Executa a dedução de saldo e formaliza o aceite."""
        ContractService.deduzir_horas_ciclo(ciclo, usuario)
        return ciclo
