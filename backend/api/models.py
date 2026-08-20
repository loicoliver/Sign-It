from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    public_key = models.TextField(blank=True, null=True, help_text="Clé publique PEM envoyée lors de l'inscription")

    def __str__(self):
        return self.username

class Document(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'En attente de signature'),
        ('IN_PROGRESS', 'En cours de signature'),
        ('COMPLETED', 'Entièrement signé'),
    ]

    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/')
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_documents')
    file_hash = models.CharField(max_length=64, help_text="Empreinte SHA-256 du fichier d'origine")
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='PENDING')
    version = models.IntegerField(default=1, help_text="Numéro de version du document (incrémenté à chaque signature)")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.status})"

class AuthorizedSigner(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='authorized_signers')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_documents')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('document', 'user')

    def __str__(self):
        return f"{self.user.username} -> {self.document.title}"

class Signature(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='signatures')
    signer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='signatures')
    signature_value = models.TextField(help_text="Signature numérique encodée en Base64")
    payload_signed = models.TextField(help_text="Payload (Hash + Signature précédente) ayant été signé")
    previous_signature = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='next_signatures')
    is_valid = models.BooleanField(default=True)
    signed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Signature de {self.signer.username} sur {self.document.title} le {self.signed_at}"

class AuditLog(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='audit_logs')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=255)
    details = models.TextField(blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.timestamp}] {self.action} par {self.user.username if self.user else 'Système'}"
