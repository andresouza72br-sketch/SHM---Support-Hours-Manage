import uuid
from decimal import Decimal

from django.db import models

from .clients import Cliente
from .contracts import Contrato
from .users import Usuario


class Pedido(models.Model):
    class Status(models.TextChoices):
        ABERTO = "ABERTO", "Aberto"
        EM_ANALISE = "EM_ANALISE", "Em Análise Técnica"
        AGUARDANDO_APROVACAO = "AGUARDANDO_APROVACAO", "Aguardando Aprovação do Cliente"
        EM_EXECUCAO = "EM_EXECUCAO", "Em Execução"
        CONCLUIDO = "CONCLUIDO", "Concluído"
        ENCERRADO = "ENCERRADO", "Encerrado"
        CANCELADO = "CANCELADO", "Cancelado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo = models.CharField("Código", max_length=30, unique=True)
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,
        related_name="pedidos",
        verbose_name="Cliente",
    )
    contrato = models.ForeignKey(
        Contrato,
        on_delete=models.PROTECT,
        related_name="pedidos",
        verbose_name="Contrato Vinculado",
    )
    solicitante = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        related_name="pedidos_solicitados",
        verbose_name="Solicitante",
    )
    titulo = models.CharField("Título / Assunto", max_length=255)
    descricao_geral = models.TextField("Descrição Geral da Solicitação")
    status = models.CharField(
        "Status",
        max_length=30,
        choices=Status.choices,
        default=Status.ABERTO,
    )
    created_at = models.DateTimeField("Criado em", auto_now_add=True)
    updated_at = models.DateTimeField("Atualizado em", auto_now=True)

    class Meta:
        verbose_name = "Pedido de Suporte"
        verbose_name_plural = "Pedidos de Suporte"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.codigo} - {self.titulo}"

    @property
    def total_horas_estimadas(self) -> Decimal:
        return sum(
            (c.horas_estimadas_total for c in self.ciclos.all()), Decimal("0.00")
        )

    @property
    def total_horas_realizadas(self) -> Decimal:
        return sum(
            (c.horas_realizadas_total for c in self.ciclos.all()), Decimal("0.00")
        )


class Ciclo(models.Model):
    class TipoManutencao(models.TextChoices):
        CORRETIVA = "CORRETIVA", "Manutenção Corretiva"
        EVOLUTIVA = "EVOLUTIVA", "Manutenção Evolutiva / Melhoria"
        CONSULTORIA_TREINAMENTO = "CONSULTORIA_TREINAMENTO", "Consultoria / Treinamento"
        ANALISE_TECNICA = "ANALISE_TECNICA", "Análise Técnica / Investigação"
        OUTROS = "OUTROS", "Outros Serviços"

    class Status(models.TextChoices):
        CRIADO = "CRIADO", "Criado"
        ORCADO = "ORCADO", "Orçado"
        AGUARDANDO_APROVACAO = "AGUARDANDO_APROVACAO", "Aguardando Aprovação do Cliente"
        APROVADO = "APROVADO", "Orçamento Aprovado"
        REJEITADO = "REJEITADO", "Orçamento Rejeitado"
        EM_EXECUCAO = "EM_EXECUCAO", "Em Execução"
        AGUARDANDO_ACEITE = "AGUARDANDO_ACEITE", "Aguardando Aceite Final do Cliente"
        ACEITO = "ACEITO", "Aceite Concedido"
        ENCERRADO = "ENCERRADO", "Encerrado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pedido = models.ForeignKey(
        Pedido,
        on_delete=models.PROTECT,
        related_name="ciclos",
        verbose_name="Pedido de Origem",
    )
    codigo = models.CharField("Código do Ciclo", max_length=30)
    titulo_contexto = models.CharField("Contexto / Título do Ciclo", max_length=255)
    tipo_manutencao = models.CharField(
        "Tipo de Manutenção",
        max_length=40,
        choices=TipoManutencao.choices,
        default=TipoManutencao.CORRETIVA,
    )
    descricao_escopo = models.TextField("Descrição do Escopo")
    horas_estimadas_total = models.DecimalField(
        "Horas Estimadas Total",
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    horas_realizadas_total = models.DecimalField(
        "Horas Realizadas Total",
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    status = models.CharField(
        "Status",
        max_length=30,
        choices=Status.choices,
        default=Status.CRIADO,
    )
    aprovado_por = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ciclos_aprovados",
        verbose_name="Orçamento Aprovado por",
    )
    aprovado_em = models.DateTimeField("Orçamento Aprovado em", null=True, blank=True)
    aceite_por = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ciclos_aceitos",
        verbose_name="Aceite Final por",
    )
    aceite_em = models.DateTimeField("Aceite Final em", null=True, blank=True)
    motivo_rejeicao = models.TextField("Motivo de Rejeição", blank=True, default="")
    created_at = models.DateTimeField("Criado em", auto_now_add=True)
    updated_at = models.DateTimeField("Atualizado em", auto_now=True)

    class Meta:
        verbose_name = "Ciclo de Execução"
        verbose_name_plural = "Ciclos de Execução"
        ordering = ["codigo"]

    def __str__(self) -> str:
        return f"{self.codigo} - {self.titulo_contexto} ({self.get_status_display()})"

    def recalcular_totais(self) -> None:
        """Recalcula a soma de horas estimadas e realizadas de suas tarefas."""
        tarefas = self.tarefas.all()
        self.horas_estimadas_total = sum(
            (t.horas_estimadas for t in tarefas), Decimal("0.00")
        )
        self.horas_realizadas_total = sum(
            (t.horas_realizadas for t in tarefas), Decimal("0.00")
        )
        self.save(update_fields=["horas_estimadas_total", "horas_realizadas_total"])


class Tarefa(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ciclo = models.ForeignKey(
        Ciclo,
        on_delete=models.CASCADE,
        related_name="tarefas",
        verbose_name="Ciclo",
    )
    descricao = models.CharField("Descrição da Tarefa", max_length=255)
    responsavel_tecnico = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tarefas_atribuidas",
        verbose_name="Técnico Responsável",
    )
    horas_estimadas = models.DecimalField(
        "Horas Estimadas",
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    horas_realizadas = models.DecimalField(
        "Horas Realizadas",
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    concluida = models.BooleanField("Concluída", default=False)
    created_at = models.DateTimeField("Criado em", auto_now_add=True)
    updated_at = models.DateTimeField("Atualizado em", auto_now=True)

    class Meta:
        verbose_name = "Tarefa"
        verbose_name_plural = "Tarefas"
        ordering = ["created_at"]

    def __str__(self) -> str:
        status_txt = "✅" if self.concluida else "⏳"
        return f"{status_txt} {self.descricao} ({self.horas_realizadas}/{self.horas_estimadas}h)"
