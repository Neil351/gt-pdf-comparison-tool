#!/usr/bin/env python3
"""
Simple PDF generator for testing the PDF comparison tool.
Creates two PDFs with intentional differences.
"""

def create_simple_pdf(filename, content_lines):
    """Create a basic PDF with the given content lines."""

    # PDF header
    pdf = "%PDF-1.4\n"

    # Object 1: Catalog
    pdf += "1 0 obj\n"
    pdf += "<< /Type /Catalog /Pages 2 0 R >>\n"
    pdf += "endobj\n"

    # Object 2: Pages
    pdf += "2 0 obj\n"
    pdf += "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>\n"
    pdf += "endobj\n"

    # Build content stream for page 1
    page1_content = "BT\n/F1 12 Tf\n50 750 Td\n"
    y_pos = 750
    for i, line in enumerate(content_lines[:20]):
        page1_content += f"({line}) Tj\n"
        y_pos -= 15
        page1_content += f"0 -15 Td\n"
    page1_content += "ET\n"

    # Build content stream for page 2
    page2_content = "BT\n/F1 12 Tf\n50 750 Td\n"
    y_pos = 750
    for i, line in enumerate(content_lines[20:]):
        page2_content += f"({line}) Tj\n"
        y_pos -= 15
        page2_content += f"0 -15 Td\n"
    page2_content += "ET\n"

    # Object 3: Page 1
    pdf += "3 0 obj\n"
    pdf += "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> "
    pdf += f"/MediaBox [0 0 612 792] /Contents 5 0 R >>\n"
    pdf += "endobj\n"

    # Object 4: Page 2
    pdf += "4 0 obj\n"
    pdf += "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> "
    pdf += f"/MediaBox [0 0 612 792] /Contents 6 0 R >>\n"
    pdf += "endobj\n"

    # Object 5: Content stream for page 1
    pdf += "5 0 obj\n"
    pdf += f"<< /Length {len(page1_content)} >>\n"
    pdf += "stream\n"
    pdf += page1_content
    pdf += "endstream\n"
    pdf += "endobj\n"

    # Object 6: Content stream for page 2
    pdf += "6 0 obj\n"
    pdf += f"<< /Length {len(page2_content)} >>\n"
    pdf += "stream\n"
    pdf += page2_content
    pdf += "endstream\n"
    pdf += "endobj\n"

    # xref table
    pdf += "xref\n"
    pdf += "0 7\n"
    pdf += "0000000000 65535 f \n"
    pdf += "0000000009 00000 n \n"
    pdf += "0000000058 00000 n \n"
    pdf += "0000000125 00000 n \n"
    pdf += f"{len(pdf):010d} 00000 n \n"
    pdf += "0000000000 00000 n \n"
    pdf += "0000000000 00000 n \n"

    # trailer
    pdf += "trailer\n"
    pdf += "<< /Size 7 /Root 1 0 R >>\n"
    pdf += "startxref\n"
    pdf += f"{len(pdf)}\n"
    pdf += "%%EOF\n"

    with open(filename, 'w') as f:
        f.write(pdf)

# Document 1: Original
doc1_content = [
    "Project Requirements Document",
    "",
    "Version: 1.0",
    "Date: January 15, 2024",
    "",
    "1. Introduction",
    "This document outlines the requirements for the new software system.",
    "",
    "2. System Overview",
    "The system will provide user authentication and data management.",
    "",
    "3. Functional Requirements",
    "- User registration and login",
    "- Password reset functionality",
    "- Profile management",
    "- Data export in CSV format",
    "",
    "4. Technical Requirements",
    "- Database: PostgreSQL 12+",
    "- Backend: Python 3.8+",
    "- Frontend: React 17+",
    "",
    "-------------------- Page 2 --------------------",
    "",
    "5. Security Requirements",
    "- HTTPS encryption required",
    "- Password hashing using bcrypt",
    "- Session timeout after 30 minutes",
    "",
    "6. Performance Requirements",
    "- Page load time under 2 seconds",
    "- Support 1000 concurrent users",
    "",
    "7. Deployment",
    "- Deploy to AWS infrastructure",
    "- Use Docker containers",
    "",
    "8. Timeline",
    "- Phase 1: 3 months",
    "- Phase 2: 2 months",
]

# Document 2: Modified
doc2_content = [
    "Project Requirements Document",
    "",
    "Version: 2.0",
    "Date: March 20, 2024",
    "",
    "1. Introduction",
    "This document outlines the requirements for the new cloud-based software system.",
    "",
    "2. System Overview",
    "The system will provide user authentication, authorization, and data management.",
    "",
    "3. Functional Requirements",
    "- User registration and login",
    "- Two-factor authentication",
    "- Password reset functionality",
    "- Profile management",
    "- Data export in CSV and JSON formats",
    "",
    "4. Technical Requirements",
    "- Database: PostgreSQL 14+",
    "- Backend: Python 3.11+",
    "- Frontend: React 18+",
    "- API: GraphQL",
    "",
    "-------------------- Page 2 --------------------",
    "",
    "5. Security Requirements",
    "- TLS 1.3 encryption required",
    "- Password hashing using argon2",
    "- Session timeout after 15 minutes",
    "- API rate limiting",
    "",
    "6. Performance Requirements",
    "- Page load time under 1 second",
    "- Support 5000 concurrent users",
    "- 99.9% uptime SLA",
    "",
    "7. Deployment",
    "- Deploy to Azure cloud infrastructure",
    "- Use Kubernetes for orchestration",
    "- Implement CI/CD pipeline",
    "",
    "8. Timeline",
    "- Phase 1: 2 months",
    "- Phase 2: 2 months",
    "- Phase 3: 1 month",
]

print("Generating test PDFs...")
create_simple_pdf("test_original.pdf", doc1_content)
create_simple_pdf("test_modified.pdf", doc2_content)
print("✓ Created test_original.pdf")
print("✓ Created test_modified.pdf")
print("\nYou can now upload these files to test the comparison tool.")
