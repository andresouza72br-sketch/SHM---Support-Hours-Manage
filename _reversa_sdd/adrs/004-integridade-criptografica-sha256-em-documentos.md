# ADR 004: Checksum Criptográfico SHA-256 em Documentos Contratuais

## Status
Aprovado / Implementado

## Contexto
Documentos PDF de propostas e contratos assinados precisam de garantia de não-repúdio e proteção contra modificações não autorizadas no sistema de arquivos do servidor.

## Decisão
Calcular o hash SHA-256 no momento do upload de qualquer documento em `ContratoDocumento` e disponibilizar endpoint de verificação em tempo real.

## Consequências
- **Positivas:** Garantia jurídica de autenticidade dos contratos e aditivos anexados.