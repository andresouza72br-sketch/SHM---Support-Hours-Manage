import uuid
import pytest
from django.core.exceptions import ValidationError
from django.db import connection, DatabaseError

from apps.contratos.models import Contrato, ForensicAuditLog, NivelRelevanciaAudit
from apps.clientes.models import Cliente
from apps.core.canonical_json import GENESIS_HASH, EMPTY_PAYLOAD_HASH


@pytest.mark.django_db
def test_forensic_audit_orm_update_blocked():
    """Garante que tentativa de atualizar instância persistida via ORM save() é rejeitada."""
    particao = f"contrato:{uuid.uuid4()}"
    log = ForensicAuditLog.objects.create(
        particao=particao,
        sequencia=1,
        tipo_evento="TESTE_IMUTABILIDADE",
        nivel_relevancia=NivelRelevanciaAudit.N1,
        descricao="Registro original",
        payload_hash=EMPTY_PAYLOAD_HASH,
        previous_hash=GENESIS_HASH,
        current_hash="a" * 64,
    )

    log.descricao = "Tentativa de adulteração"
    with pytest.raises(ValidationError) as exc:
        log.save()
    assert "estritamente imutáveis" in str(exc.value)


@pytest.mark.django_db
def test_forensic_audit_orm_delete_blocked():
    """Garante que tentativa de exclusão via ORM delete() é rejeitada."""
    particao = f"contrato:{uuid.uuid4()}"
    log = ForensicAuditLog.objects.create(
        particao=particao,
        sequencia=1,
        tipo_evento="TESTE_IMUTABILIDADE",
        nivel_relevancia=NivelRelevanciaAudit.N1,
        descricao="Registro original",
        payload_hash=EMPTY_PAYLOAD_HASH,
        previous_hash=GENESIS_HASH,
        current_hash="b" * 64,
    )

    with pytest.raises(ValidationError) as exc:
        log.delete()
    assert "estritamente imutáveis" in str(exc.value)


@pytest.mark.django_db
def test_forensic_audit_orm_queryset_update_and_delete_blocked():
    """Garante que operações em lote via QuerySet (.update() e .delete()) são barradas no ORM."""
    particao = f"contrato:{uuid.uuid4()}"
    ForensicAuditLog.objects.create(
        particao=particao,
        sequencia=1,
        tipo_evento="TESTE_IMUTABILIDADE",
        nivel_relevancia=NivelRelevanciaAudit.N1,
        descricao="Registro original",
        payload_hash=EMPTY_PAYLOAD_HASH,
        previous_hash=GENESIS_HASH,
        current_hash="c" * 64,
    )

    qs = ForensicAuditLog.objects.filter(particao=particao)

    with pytest.raises(ValidationError) as exc_upd:
        qs.update(descricao="Tentativa em massa")
    assert "estritamente imutáveis" in str(exc_upd.value)

    with pytest.raises(ValidationError) as exc_del:
        qs.delete()
    assert "estritamente imutáveis" in str(exc_del.value)


@pytest.mark.django_db(transaction=True)
def test_forensic_audit_native_database_trigger_blocks_update_and_delete():
    """
    Garante que comandos diretos de SQL (bypassing ORM) são bloqueados pelo gatilho nativo do banco.
    Em ambiente SQLite de teste, instala temporariamente os triggers de validação DDL e remove no encerramento.
    """
    particao = f"contrato:{uuid.uuid4()}"
    record_id = uuid.uuid4()
    is_sqlite = connection.vendor == "sqlite"

    with connection.cursor() as cursor:
        if is_sqlite:
            cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS trg_temp_forensic_immutable_update
                BEFORE UPDATE ON shm_forensic_audit_trail
                BEGIN
                    SELECT RAISE(ABORT, 'A tabela shm_forensic_audit_trail é estritamente imutável (append-only). Alterações são proibidas.');
                END;
            """)
            cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS trg_temp_forensic_immutable_delete
                BEFORE DELETE ON shm_forensic_audit_trail
                BEGIN
                    SELECT RAISE(ABORT, 'A tabela shm_forensic_audit_trail é estritamente imutável (append-only). Exclusões são proibidas.');
                END;
            """)

        try:
            cursor.execute(
                """
                INSERT INTO shm_forensic_audit_trail (
                    id, particao, sequencia, tipo_evento, nivel_relevancia,
                    descricao, payload_hash, previous_hash, current_hash,
                    dados_payload, timestamp
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP
                )
                """,
                [
                    str(record_id),
                    particao,
                    1,
                    "TESTE_SQL_DIRETO",
                    "N1",
                    "Registro DDL",
                    EMPTY_PAYLOAD_HASH,
                    GENESIS_HASH,
                    "d" * 64,
                    "{}",
                ],
            )

            # Tentativa de UPDATE direto no banco
            with pytest.raises(DatabaseError) as exc_upd:
                cursor.execute(
                    "UPDATE shm_forensic_audit_trail SET descricao = 'adulterado' WHERE id = %s",
                    [str(record_id)],
                )
            assert "imutável" in str(exc_upd.value).lower() or "proibidas" in str(exc_upd.value).lower()

            # Tentativa de DELETE direto no banco
            with pytest.raises(DatabaseError) as exc_del:
                cursor.execute(
                    "DELETE FROM shm_forensic_audit_trail WHERE id = %s",
                    [str(record_id)],
                )
            assert "imutável" in str(exc_del.value).lower() or "proibidas" in str(exc_del.value).lower()

        finally:
            if is_sqlite:
                cursor.execute("DROP TRIGGER IF EXISTS trg_temp_forensic_immutable_update;")
                cursor.execute("DROP TRIGGER IF EXISTS trg_temp_forensic_immutable_delete;")
                cursor.execute("DELETE FROM shm_forensic_audit_trail WHERE id = %s", [str(record_id)])
