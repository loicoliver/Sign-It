"""
Utilitaires pour manipuler les PDFs et ajouter des pages de signatures.
"""
import os
from datetime import datetime
from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor


def add_signature_page_to_pdf(original_pdf_path: str, signatures_data: list, output_pdf_path: str):
    """
    Ajoute une page de signatures à la fin d'un PDF existant.
    
    Args:
        original_pdf_path: Chemin vers le PDF original
        signatures_data: Liste de dictionnaires avec les infos de chaque signature
            [{'signer': 'alice', 'signed_at': datetime, 'signature_value': 'base64...'}]
        output_pdf_path: Chemin où sauvegarder le nouveau PDF
    """
    # 1. Lire le PDF original
    reader = PdfReader(original_pdf_path)
    writer = PdfWriter()
    
    # 2. Copier toutes les pages originales
    for page in reader.pages:
        writer.add_page(page)
    
    # 3. Créer la page de signatures
    signature_page_pdf = create_signature_page(signatures_data)
    signature_reader = PdfReader(signature_page_pdf)
    writer.add_page(signature_reader.pages[0])
    
    # 4. Sauvegarder le nouveau PDF
    with open(output_pdf_path, 'wb') as output_file:
        writer.write(output_file)


def create_signature_page(signatures_data: list) -> BytesIO:
    """
    Génère une page PDF avec la liste des signatures.
    
    Returns:
        BytesIO contenant le PDF de la page de signatures
    """
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Styles et couleurs
    title_color = HexColor('#0284c7')
    text_color = HexColor('#1e293b')
    subtitle_color = HexColor('#64748b')
    border_color = HexColor('#38bdf8')
    bg_color = HexColor('#f1f5f9')
    
    # Titre principal
    c.setFillColor(title_color)
    c.setFont('Helvetica-Bold', 20)
    c.drawString(2*cm, height - 3*cm, '🔐 Signatures Électroniques')
    
    # Ligne de séparation
    c.setStrokeColor(border_color)
    c.setLineWidth(2)
    c.line(2*cm, height - 3.5*cm, width - 2*cm, height - 3.5*cm)
    
    # Sous-titre
    c.setFillColor(subtitle_color)
    c.setFont('Helvetica', 10)
    c.drawString(2*cm, height - 4.2*cm, 
                 f'Document signé par {len(signatures_data)} personne(s) - '
                 f'Chaîne cryptographique validée')
    
    # Liste des signatures
    y_position = height - 5.5*cm
    
    for idx, sig in enumerate(signatures_data, 1):
        # Cadre pour chaque signature
        c.setFillColor(bg_color)
        c.rect(2*cm, y_position - 2.5*cm, width - 4*cm, 2.3*cm, fill=1, stroke=0)
        
        # Bordure gauche colorée
        c.setFillColor(border_color)
        c.rect(2*cm, y_position - 2.5*cm, 0.3*cm, 2.3*cm, fill=1, stroke=0)
        
        # Numéro de signature
        c.setFillColor(title_color)
        c.setFont('Helvetica-Bold', 12)
        c.drawString(2.5*cm, y_position - 0.5*cm, f'Signature #{idx}')
        
        # Nom du signataire
        c.setFillColor(text_color)
        c.setFont('Helvetica-Bold', 11)
        c.drawString(2.5*cm, y_position - 1*cm, f"👤 Signataire : {sig['signer']}")
        
        # Date et heure
        c.setFillColor(subtitle_color)
        c.setFont('Helvetica', 9)
        signed_at = sig['signed_at']
        if isinstance(signed_at, str):
            date_str = signed_at
        else:
            date_str = signed_at.strftime('%d/%m/%Y à %H:%M:%S')
        c.drawString(2.5*cm, y_position - 1.5*cm, f"📅 Date : {date_str}")
        
        # Signature (tronquée)
        sig_value = sig['signature_value']
        sig_short = sig_value[:60] + '...' if len(sig_value) > 60 else sig_value
        c.setFont('Courier', 7)
        c.drawString(2.5*cm, y_position - 2*cm, f"🔑 Signature : {sig_short}")
        
        y_position -= 3*cm
        
        # Si on arrive en bas de la page, créer une nouvelle page
        if y_position < 4*cm and idx < len(signatures_data):
            c.showPage()
            y_position = height - 3*cm
            c.setFont('Helvetica-Bold', 14)
            c.setFillColor(title_color)
            c.drawString(2*cm, height - 2*cm, 'Signatures (suite)')
    
    # Pied de page
    c.setFillColor(subtitle_color)
    c.setFont('Helvetica', 8)
    footer_text = f'Document généré le {datetime.now().strftime("%d/%m/%Y à %H:%M")} - Sign It App'
    c.drawString(2*cm, 1.5*cm, footer_text)
    
    # Watermark
    c.setFont('Helvetica', 7)
    c.drawString(width - 8*cm, 1.5*cm, '✅ Signatures cryptographiquement vérifiées')
    
    c.save()
    buffer.seek(0)
    return buffer


def create_new_version_path(original_path: str, version: int) -> str:
    """
    Génère un nouveau chemin de fichier pour une version signée.
    Ex: document.pdf -> document_v2.pdf
    
    Args:
        original_path: Chemin original (ex: media/documents/doc.pdf)
        version: Numéro de version (1, 2, 3...)
    
    Returns:
        Nouveau chemin avec version
    """
    base, ext = os.path.splitext(original_path)
    return f"{base}_v{version}{ext}"
