import pdfplumber
from docx import Document
import os


def extract_text_from_pdf(file_path: str):

    text = ""

    with pdfplumber.open(file_path) as pdf:

        for page in pdf.pages:

            page_text = page.extract_text()

            if page_text:
                text += page_text + "\n"

    return text


def extract_text_from_docx(file_path: str):

    doc = Document(file_path)

    text = "\n".join(
        [para.text for para in doc.paragraphs]
    )

    return text


def extract_resume_text(file_path: str):

    extension = os.path.splitext(file_path)[1].lower()

    if extension == ".pdf":
        return extract_text_from_pdf(file_path)

    elif extension == ".docx":
        return extract_text_from_docx(file_path)

    else:
        raise Exception("Unsupported file format")