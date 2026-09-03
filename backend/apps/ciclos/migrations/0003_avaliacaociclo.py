from django.conf import settings
from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ciclos', '0002_ciclo_aceito_ip_ciclo_aceito_metodo_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AvaliacaoCiclo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('nota', models.PositiveSmallIntegerField(
                    verbose_name='nota (1–5)',
                    validators=[
                        django.core.validators.MinValueValidator(1),
                        django.core.validators.MaxValueValidator(5),
                    ],
                )),
                ('comentario', models.TextField(blank=True, max_length=2000, verbose_name='comentário')),
                ('avaliador', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='avaliacoes_ciclos',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='avaliador',
                )),
                ('ciclo', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='avaliacao',
                    to='ciclos.ciclo',
                    verbose_name='ciclo avaliado',
                )),
            ],
            options={
                'verbose_name': 'avaliação de ciclo',
                'verbose_name_plural': 'avaliações de ciclos',
                'db_table': 'shm_avaliacao_ciclo',
            },
        ),
    ]
