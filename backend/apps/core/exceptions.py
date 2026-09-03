import logging
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        if isinstance(exc, DjangoValidationError):
            if hasattr(exc, "message_dict"):
                data = exc.message_dict
            elif hasattr(exc, "messages"):
                data = {"detail": exc.messages}
            else:
                data = {"detail": str(exc)}
            return Response(data, status=status.HTTP_400_BAD_REQUEST)
        
        logger.error(f"Unhandled Exception: {exc}", exc_info=True)
        return Response(
            {"detail": "Ocorreu um erro interno no servidor."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response