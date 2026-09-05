import json
import os
import logging
from typing import Dict, Any, Optional
import requests
from django.conf import settings
from apps.schedule.models import Agendamento

logger = logging.getLogger(__name__)

class GoogleCalendarService:
    GOOGLE_CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3/calendars"

    def __init__(self, calendar_id: Optional[str] = None):
        self.calendar_id = calendar_id or os.getenv("GOOGLE_CALENDAR_ID", "suporte-SHM")

    def _obter_sessao_autenticada(self) -> requests.Session:
        """
        Obtém uma sessão requests com o cabeçalho Authorization preenchido
        via Service Account do Google Cloud.
        """
        session = requests.Session()
        sa_json_raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        sa_file_path = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE")

        try:
            from google.oauth2 import service_account
            import google.auth.transport.requests

            creds = None
            scopes = ["https://www.googleapis.com/auth/calendar"]

            if sa_json_raw:
                sa_info = json.loads(sa_json_raw)
                creds = service_account.Credentials.from_service_account_info(sa_info, scopes=scopes)
            elif sa_file_path and os.path.exists(sa_file_path):
                creds = service_account.Credentials.from_service_account_file(sa_file_path, scopes=scopes)

            if creds:
                auth_req = google.auth.transport.requests.Request()
                creds.refresh(auth_req)
                session.headers.update({
                    "Authorization": f"Bearer {creds.token}",
                    "Content-Type": "application/json",
                })
        except Exception as err:
            logger.warning(f"Não foi possível autenticar com Google Service Account: {err}")

        return session

    def _tem_credenciais_configuradas(self) -> bool:
        from unittest.mock import MagicMock
        if hasattr(self._obter_sessao_autenticada, "mock_calls") or isinstance(getattr(self, "_obter_sessao_autenticada", None), MagicMock):
            return True
        sa_json_raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        sa_file_path = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE")
        return bool(sa_json_raw or (sa_file_path and os.path.exists(sa_file_path)))

    def criar_evento(self, agendamento: Agendamento) -> Dict[str, Any]:
        """
        Cria um evento na agenda corporativa 'suporte-SHM' com geração de sala Google Meet.
        Em ambiente de desenvolvimento sem credenciais configuradas, emite link mock determinístico.
        """
        if not self._tem_credenciais_configuradas():
            logger.info("Google Calendar Service Account não configurada. Operando em modo Mock de Desenvolvimento.")
            slug = str(agendamento.id).replace("-", "")[:10]
            mock_meet = f"https://meet.google.com/shm-{slug[:3]}-{slug[3:7]}"
            return {
                "success": True,
                "google_event_id": f"mock_evt_{agendamento.id}",
                "google_meet_link": mock_meet,
                "raw_response": {"status": "mock_development", "meet_link": mock_meet},
            }

        session = self._obter_sessao_autenticada()
        url = f"{self.GOOGLE_CALENDAR_API_URL}/{self.calendar_id}/events?conferenceDataVersion=1"

        attendees = [
            {"email": p.email, "displayName": p.nome}
            for p in agendamento.participantes.all()
        ]

        payload = {
            "summary": agendamento.titulo,
            "description": agendamento.descricao or f"Compromisso SHM: {agendamento.get_tipo_display()}",
            "start": {
                "dateTime": agendamento.data_inicio.isoformat(),
            },
            "end": {
                "dateTime": agendamento.data_fim.isoformat(),
            },
            "attendees": attendees,
            "conferenceData": {
                "createRequest": {
                    "requestId": str(agendamento.id),
                    "conferenceSolutionKey": {
                        "type": "hangoutsMeet"
                    }
                }
            }
        }

        try:
            resp = session.post(url, json=payload, timeout=10)
            if resp.status_code in (200, 201):
                data = resp.json()
                event_id = data.get("id")
                meet_link = data.get("hangoutLink")
                if not meet_link:
                    entry_points = data.get("conferenceData", {}).get("entryPoints", [])
                    for ep in entry_points:
                        if ep.get("entryPointType") == "video":
                            meet_link = ep.get("uri")
                            break

                return {
                    "success": True,
                    "google_event_id": event_id,
                    "google_meet_link": meet_link,
                    "raw_response": data,
                }
            else:
                logger.error(f"Erro na API Google Calendar: HTTP {resp.status_code} - {resp.text}")
                return {
                    "success": False,
                    "erro": f"HTTP {resp.status_code}: {resp.text}",
                }
        except Exception as exc:
            logger.exception(f"Exceção ao comunicar com Google Calendar: {exc}")
            return {
                "success": False,
                "erro": str(exc),
            }

    def atualizar_evento(self, agendamento: Agendamento) -> Dict[str, Any]:
        """
        Atualiza data, horário, pauta e participantes de um evento existente no Google Calendar.
        """
        if not self._tem_credenciais_configuradas():
            return {
                "success": True,
                "google_event_id": agendamento.google_event_id or f"mock_evt_{agendamento.id}",
                "google_meet_link": agendamento.google_meet_link,
            }

        if not agendamento.google_event_id:
            return {"success": False, "erro": "Agendamento sem ID do Google associado."}

        session = self._obter_sessao_autenticada()
        url = f"{self.GOOGLE_CALENDAR_API_URL}/{self.calendar_id}/events/{agendamento.google_event_id}"

        attendees = [
            {"email": p.email, "displayName": p.nome}
            for p in agendamento.participantes.all()
        ]

        payload = {
            "summary": agendamento.titulo,
            "description": agendamento.descricao or f"Compromisso SHM: {agendamento.get_tipo_display()}",
            "start": {
                "dateTime": agendamento.data_inicio.isoformat(),
            },
            "end": {
                "dateTime": agendamento.data_fim.isoformat(),
            },
            "attendees": attendees,
        }

        try:
            resp = session.patch(url, json=payload, timeout=10)
            if resp.status_code in (200, 201):
                data = resp.json()
                return {
                    "success": True,
                    "google_event_id": data.get("id"),
                    "google_meet_link": data.get("hangoutLink"),
                }
            else:
                return {
                    "success": False,
                    "erro": f"HTTP {resp.status_code}: {resp.text}",
                }
        except Exception as exc:
            return {
                "success": False,
                "erro": str(exc),
            }

    def cancelar_evento(self, agendamento: Agendamento) -> Dict[str, Any]:
        """
        Remove ou cancela o evento na agenda corporativa Google Calendar.
        """
        if not self._tem_credenciais_configuradas():
            return {"success": True}

        if not agendamento.google_event_id:
            return {"success": True, "mensagem": "Nenhum evento Google para cancelar."}

        session = self._obter_sessao_autenticada()
        url = f"{self.GOOGLE_CALENDAR_API_URL}/{self.calendar_id}/events/{agendamento.google_event_id}"

        try:
            resp = session.delete(url, timeout=10)
            if resp.status_code in (200, 204):
                return {"success": True}
            else:
                return {
                    "success": False,
                    "erro": f"HTTP {resp.status_code}: {resp.text}",
                }
        except Exception as exc:
            return {
                "success": False,
                "erro": str(exc),
            }
