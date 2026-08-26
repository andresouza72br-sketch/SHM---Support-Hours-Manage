from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('comunicacao', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='comentario',
            name='parent',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='respostas',
                to='comunicacao.comentario',
                verbose_name='comentário pai',
            ),
        ),
        migrations.CreateModel(
            name='ReacaoComentario',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('tipo', models.CharField(default='like', max_length=20, verbose_name='tipo de reação')),
                ('comentario', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='reacoes',
                    to='comunicacao.comentario',
                    verbose_name='comentário',
                )),
                ('autor', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='reacoes_comentarios',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='autor da reação',
                )),
            ],
            options={
                'verbose_name': 'reação ao comentário',
                'verbose_name_plural': 'reações aos comentários',
                'db_table': 'shm_reacao_comentario',
                'unique_together': {('comentario', 'autor', 'tipo')},
            },
        ),
    ]
