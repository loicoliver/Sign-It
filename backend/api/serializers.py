from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Document, AuthorizedSigner, Signature, AuditLog

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'public_key', 'first_name', 'last_name']
        read_only_fields = ['id']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    public_key = serializers.CharField(required=True, allow_blank=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'public_key']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            public_key=validated_data['public_key']
        )
        return user

class AuthorizedSignerSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)

    class Meta:
        model = AuthorizedSigner
        fields = ['id', 'document', 'user', 'user_details', 'added_at']
        read_only_fields = ['id', 'added_at']

class SignatureSerializer(serializers.ModelSerializer):
    signer_details = UserSerializer(source='signer', read_only=True)

    class Meta:
        model = Signature
        fields = ['id', 'document', 'signer', 'signer_details', 'signature_value', 'payload_signed', 'previous_signature', 'is_valid', 'signed_at']
        read_only_fields = ['id', 'signer', 'signed_at']

class AuditLogSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'document', 'user', 'user_details', 'action', 'details', 'timestamp']
        read_only_fields = ['id', 'timestamp']

class DocumentSerializer(serializers.ModelSerializer):
    owner_details = UserSerializer(source='owner', read_only=True)
    authorized_signers = AuthorizedSignerSerializer(many=True, read_only=True)
    signatures = SignatureSerializer(many=True, read_only=True)
    audit_logs = AuditLogSerializer(many=True, read_only=True)

    class Meta:
        model = Document
        fields = ['id', 'title', 'file', 'owner', 'owner_details', 'file_hash', 'status', 'created_at', 'authorized_signers', 'signatures', 'audit_logs']
        read_only_fields = ['id', 'owner', 'file_hash', 'status', 'created_at']
