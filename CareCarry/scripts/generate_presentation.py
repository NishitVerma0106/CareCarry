import sys
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_presentation():
    prs = Presentation()
    # 16:9 Widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Theme Colors
    BG_DARK = RGBColor(15, 23, 42)       # Slate 900
    SURFACE_DARK = RGBColor(30, 41, 59)  # Slate 800
    SURFACE_LIGHT = RGBColor(51, 65, 85) # Slate 700
    TEXT_WHITE = RGBColor(248, 250, 252) # Slate 50
    TEXT_MUTED = RGBColor(148, 163, 184) # Slate 400
    ACCENT_BLUE = RGBColor(59, 130, 246) # Blue 500
    ACCENT_CYAN = RGBColor(56, 189, 248) # Sky 400
    ACCENT_GREEN = RGBColor(16, 185, 129)# Emerald 500
    ACCENT_PURPLE = RGBColor(139, 92, 246)# Violet 500
    ACCENT_AMBER = RGBColor(245, 158, 11)# Amber 500
    BORDER_COLOR = RGBColor(71, 85, 105) # Slate 600

    def add_header(slide, title, category="CARECARRY ARCHITECTURE"):
        # Category pill
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(8), Inches(0.4))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category.upper()
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = ACCENT_CYAN

        # Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.7), Inches(0.8))
        tf = title_box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(24)
        p.font.bold = True
        p.font.color.rgb = TEXT_WHITE

    def set_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_DARK
        bg.line.fill.background() # No border
        return bg

    def create_card(slide, left, top, width, height, bg_color=SURFACE_DARK, border_color=BORDER_COLOR):
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
        shape.fill.solid()
        shape.fill.fore_color.rgb = bg_color
        if border_color:
            shape.line.color.rgb = border_color
            shape.line.width = Pt(1.5)
        else:
            shape.line.fill.background()
        return shape

    # =========================================================================
    # SLIDE 1: TITLE SLIDE
    # =========================================================================
    slide1 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide1)

    # Decorative background card
    create_card(slide1, 0.8, 1.2, 11.733, 5.1, bg_color=SURFACE_DARK, border_color=ACCENT_BLUE)

    # Title box
    tb = slide1.shapes.add_textbox(Inches(1.4), Inches(1.8), Inches(10.5), Inches(3.8))
    tf = tb.text_frame
    tf.word_wrap = True

    p0 = tf.paragraphs[0]
    p0.text = "CARECARRY · DIGITAL HEALTH INTEROPERABILITY"
    p0.font.size = Pt(13)
    p0.font.bold = True
    p0.font.color.rgb = ACCENT_CYAN
    p0.space_after = Pt(12)

    p1 = tf.add_paragraph()
    p1.text = "CareCarry — ABDM-Ready Health\nInteroperability Model"
    p1.font.size = Pt(36)
    p1.font.bold = True
    p1.font.color.rgb = TEXT_WHITE
    p1.space_after = Pt(16)

    p2 = tf.add_paragraph()
    p2.text = "A Consent-Driven Patient Health Data Access Layer Connecting Fragmented Clinical Systems\nWithout Duplicating Hospital Medical Records"
    p2.font.size = Pt(15)
    p2.font.color.rgb = TEXT_MUTED
    p2.space_after = Pt(32)

    p3 = tf.add_paragraph()
    p3.text = "Capstone Presentation | Ayushman Bharat Digital Mission (ABDM) & HL7 FHIR Interoperability Framework"
    p3.font.size = Pt(12)
    p3.font.color.rgb = ACCENT_GREEN

    # =========================================================================
    # SLIDE 2: WHY THE ARCHITECTURE CHANGED (PARADIGM SHIFT)
    # =========================================================================
    slide2 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide2)
    add_header(slide2, "Why the Architecture Changed: From Central EMR to Interoperability Layer")

    # Left Column: Old Architecture
    create_card(slide2, 0.8, 1.6, 5.6, 5.2, bg_color=SURFACE_DARK, border_color=RGBColor(239, 68, 68))
    tb_old = slide2.shapes.add_textbox(Inches(1.1), Inches(1.8), Inches(5.0), Inches(4.7))
    tf_old = tb_old.text_frame
    tf_old.word_wrap = True

    p = tf_old.paragraphs[0]
    p.text = "❌ OLD MODEL: RE-UPLOAD DATABASE"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = RGBColor(239, 68, 68)
    p.space_after = Pt(14)

    bullets_old = [
        ("Redundant Hospital Uploads", "Hospitals already possess advanced HIS/EMRs (Epic, Cerner, Medanta, Apollo). Expecting staff to manually re-upload PDFs to CareCarry creates friction and zero clinical adoption."),
        ("Security & Liability Risks", "Storing medical document binaries centrally in MySQL / Cloudinary creates a massive single point of failure and HIPAA/DISHA data liability."),
        ("Unmanageable Data Drift", "Once a report is cloned into CareCarry, amendments, addendums, and corrections made in the hospital system are never synchronized."),
        ("Wrong Strategic Role", "CareCarry was erroneously positioning itself as a competitor to existing hospital EMRs.")
    ]
    for title, desc in bullets_old:
        p = tf_old.add_paragraph()
        p.text = f"• {title}: "
        p.font.bold = True
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_WHITE
        p.space_after = Pt(6)
        
        # Add desc
        run = p.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = TEXT_MUTED

    # Right Column: New Architecture
    create_card(slide2, 6.9, 1.6, 5.6, 5.2, bg_color=SURFACE_DARK, border_color=ACCENT_GREEN)
    tb_new = slide2.shapes.add_textbox(Inches(7.2), Inches(1.8), Inches(5.0), Inches(4.7))
    tf_new = tb_new.text_frame
    tf_new.word_wrap = True

    p = tf_new.paragraphs[0]
    p.text = "✔ NEW MODEL: HEALTH DATA ACCESS LAYER"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = ACCENT_GREEN
    p.space_after = Pt(14)

    bullets_new = [
        ("Source of Truth Stays at Hospital", "Participating hospitals (Government, Apollo, Max) retain sovereign custody of their medical records. CareCarry never copies the database."),
        ("Zero-Duplication Federated Query", "CareCarry indexes record metadata and references. Clinical documents are streamed on-demand directly from hospital APIs only upon authorized clinician viewing."),
        ("Consent & Identity Orchestration", "CareCarry handles patient matching, identity linkage, and dynamic clinician access tokens—the hard interoperability problem."),
        ("Complementary, Not Competitive", "CareCarry connects healthcare systems rather than trying to replace them.")
    ]
    for title, desc in bullets_new:
        p = tf_new.add_paragraph()
        p.text = f"• {title}: "
        p.font.bold = True
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_WHITE
        p.space_after = Pt(6)
        
        run = p.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 3: NATIONAL HEALTH INTEGRATION (ABDM & ABHA)
    # =========================================================================
    slide3 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide3)
    add_header(slide3, "National Health Integration: ABHA Identity vs. CareCarry App Identity")

    # 3 Cards across the slide
    cards_data = [
        ("1. ABHA ID (National Identity)", ACCENT_BLUE, [
            ("Authoritative Ecosystem", "Ayushman Bharat Health Account (ABHA) is India's 14-digit national health identifier managed by the National Health Authority (NHA)."),
            ("Identity Context Only", "Crucial correction: ABHA is NOT a physical card containing PDFs. It provides the digital identity context to find where a citizen's records reside across India."),
            ("Example", "91-4521-8890-1234 (Unique National Patient Identifier)")
        ]),
        ("2. CareCarry User ID (App Context)", ACCENT_PURPLE, [
            ("Application Session Identity", "CareCarry assigns an internal user identity (e.g. CC-7K3QX9AB) for app routing, reception triage tokens, and UI state."),
            ("Clear Engineering Separation", "CareCarry ID != ABHA ID. CareCarry does NOT claim to be India's medical identity. It is an interoperability client application."),
            ("Identity Mapping", "Mapped securely via the provider_patient_mappings registry in backend database.")
        ]),
        ("3. Defensible Presentation Claims", ACCENT_AMBER, [
            ("Academic Integrity", "We do NOT claim direct production access to live government servers without certified ABDM production keys."),
            ("Interoperability Client Model", "CareCarry is built strictly as an ABDM-ready client application following official FHIR R4 and ABDM v0.5 data standards."),
            ("Ready for Certification", "Designed to swap mock adapters for real NHA Sandbox endpoints seamlessly.")
        ])
    ]

    for idx, (head, col, items) in enumerate(cards_data):
        x = 0.8 + idx * 3.95
        create_card(slide3, x, 1.6, 3.8, 5.2, bg_color=SURFACE_DARK, border_color=col)
        tb_c = slide3.shapes.add_textbox(Inches(x + 0.2), Inches(1.8), Inches(3.4), Inches(4.7))
        tf_c = tb_c.text_frame
        tf_c.word_wrap = True

        p = tf_c.paragraphs[0]
        p.text = head
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = col
        p.space_after = Pt(14)

        for it_title, it_desc in items:
            p = tf_c.add_paragraph()
            p.text = f"{it_title}: "
            p.font.bold = True
            p.font.size = Pt(11)
            p.font.color.rgb = TEXT_WHITE
            p.space_after = Pt(6)
            run = p.add_run()
            run.text = it_desc
            run.font.bold = False
            run.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 4: COMPLETE SYSTEM ARCHITECTURE
    # =========================================================================
    slide4 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide4)
    add_header(slide4, "Complete Multi-Tier System Architecture: Access Layer Pattern")

    # Layer 1: Client Layer
    create_card(slide4, 0.8, 1.6, 11.733, 1.0, bg_color=SURFACE_DARK, border_color=ACCENT_CYAN)
    tb_l1 = slide4.shapes.add_textbox(Inches(1.0), Inches(1.7), Inches(11.3), Inches(0.8))
    tf_l1 = tb_l1.text_frame
    tf_l1.word_wrap = True
    p = tf_l1.paragraphs[0]
    p.text = "TIER 1: CITIZEN / PATIENT PRESENTATION LAYER (CareCarry Web & Mobile)"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = ACCENT_CYAN
    p = tf_l1.add_paragraph()
    p.text = "Patient Portal (Vite + React)  ·  Dynamic QR Consent  ·  Unified Health Timeline  ·  ABHA ID Linking  ·  Live Document Stream Viewer"
    p.font.size = Pt(11)
    p.font.color.rgb = TEXT_WHITE

    # Layer 2: CareCarry Backend Gateway
    create_card(slide4, 0.8, 2.8, 11.733, 1.6, bg_color=SURFACE_DARK, border_color=ACCENT_BLUE)
    tb_l2 = slide4.shapes.add_textbox(Inches(1.0), Inches(2.9), Inches(11.3), Inches(1.4))
    tf_l2 = tb_l2.text_frame
    tf_l2.word_wrap = True
    p = tf_l2.paragraphs[0]
    p.text = "TIER 2: CARECARRY INTEROPERABILITY GATEWAY (Node.js + Express + MySQL)"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = ACCENT_BLUE
    p = tf_l2.add_paragraph()
    p.text = "• Identity Service: Resolves ABHA ID <-> CareCarry ID mapping via provider_patient_mappings\n• Consent Manager: Verifies clinician RBAC & token authorization before querying external networks\n• Discovery Service: Indexes federated record references (metadata only, zero PDF duplication)\n• Streaming Pipeline: Ephemeral document proxy pulling source records on-the-fly without database cloning"
    p.font.size = Pt(10.5)
    p.font.color.rgb = TEXT_WHITE

    # Layer 3: Interoperability Ecosystem & Standards
    create_card(slide4, 0.8, 4.6, 11.733, 0.9, bg_color=SURFACE_DARK, border_color=ACCENT_PURPLE)
    tb_l3 = slide4.shapes.add_textbox(Inches(1.0), Inches(4.7), Inches(11.3), Inches(0.7))
    tf_l3 = tb_l3.text_frame
    tf_l3.word_wrap = True
    p = tf_l3.paragraphs[0]
    p.text = "TIER 3: INTEROPERABILITY PROTOCOLS (HL7 FHIR R4 + ABDM v0.5 Standards)"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = ACCENT_PURPLE
    p = tf_l3.add_paragraph()
    p.text = "FHIR Resource Normalization: Patient  ·  Encounter  ·  Observation (Vitals/Labs)  ·  DiagnosticReport  ·  MedicationRequest"
    p.font.size = Pt(11)
    p.font.color.rgb = TEXT_WHITE

    # Layer 4: Sovereign Healthcare Providers
    create_card(slide4, 0.8, 5.7, 11.733, 1.3, bg_color=SURFACE_DARK, border_color=ACCENT_GREEN)
    tb_l4 = slide4.shapes.add_textbox(Inches(1.0), Inches(5.8), Inches(11.3), Inches(1.1))
    tf_l4 = tb_l4.text_frame
    tf_l4.word_wrap = True
    p = tf_l4.paragraphs[0]
    p.text = "TIER 4: SOVEREIGN HEALTHCARE PROVIDERS (Owners of the Medical Records)"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = ACCENT_GREEN
    p = tf_l4.add_paragraph()
    p.text = "[Node 1] Government District Hospital (District e-Hospital HIS)\n[Node 2] Apollo Hospitals Central HIS (Metabolic Panels, 2D Echo Doppler Studies)\n[Node 3] Max Healthcare EMR Network (Inpatient Discharge Summaries, Respiratory Regimens)\n[Node 4] Diagnostic Laboratory LIS (CBC, Lipid Profiles, Pathology Scans)"
    p.font.size = Pt(10)
    p.font.color.rgb = TEXT_WHITE

    # =========================================================================
    # SLIDE 5: RURAL GOVERNMENT HOSPITAL WORKFLOW (REAL-WORLD USE CASE)
    # =========================================================================
    slide5 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide5)
    add_header(slide5, "Hospital Workflow Without Duplicate Uploads: The Rural Hospital Use Case")

    # Workflow Steps in 4 Cards
    wf_steps = [
        ("Step 1: Patient Visit & ABHA Verification", ACCENT_BLUE, [
            ("Citizen Intake", "Patient visits rural Community Health Centre (CHC) or District Hospital."),
            ("ABHA Identification", "Patient provides 14-digit ABHA ID or scans hospital registration counter QR."),
            ("Zero CareCarry Friction", "Hospital receptionist uses their standard hospital software (e-Hospital). They DO NOT log into CareCarry.")
        ]),
        ("Step 2: Hospital Creates Clinical Record", ACCENT_AMBER, [
            ("Physician Consultation", "Government doctor examines patient, enters symptoms, prescribes medications."),
            ("Lab & Diagnostic Orders", "Hospital lab inputs CBC blood test results into hospital's internal system."),
            ("Local Record Retention", "The medical record resides securely in the Government Hospital's HIS database.")
        ]),
        ("Step 3: Interoperability Gateway Indexing", ACCENT_PURPLE, [
            ("Metadata Registration", "The hospital's interoperability client registers an event reference with CareCarry Gateway."),
            ("What CareCarry Stores", "Record ID: LAB-GH-401, Type: LAB_REPORT, Date: 2026-09-28, Source: Govt Hospital."),
            ("What CareCarry DOES NOT Store", "Zero PDF or binary file duplicates are stored in CareCarry MySQL.")
        ]),
        ("Step 4: Citizen Opens CareCarry Later", ACCENT_GREEN, [
            ("Unified Health Timeline", "Patient opens CareCarry at home or when visiting a specialist in the city."),
            ("Chronological View", "Sees 28 Sep 2026: Govt Hospital OPD Consultation + Blood Test."),
            ("On-Demand Streaming", "Doctor clicks 'View Report' -> CareCarry pulls file live from source hospital API!")
        ])
    ]

    for idx, (title, col, bullets) in enumerate(wf_steps):
        x = 0.8 + idx * 2.95
        create_card(slide5, x, 1.6, 2.8, 5.2, bg_color=SURFACE_DARK, border_color=col)
        tb_s = slide5.shapes.add_textbox(Inches(x + 0.15), Inches(1.8), Inches(2.5), Inches(4.7))
        tf_s = tb_s.text_frame
        tf_s.word_wrap = True

        p = tf_s.paragraphs[0]
        p.text = title
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = col
        p.space_after = Pt(12)

        for b_head, b_body in bullets:
            p = tf_s.add_paragraph()
            p.text = f"{b_head}: "
            p.font.bold = True
            p.font.size = Pt(10)
            p.font.color.rgb = TEXT_WHITE
            p.space_after = Pt(4)
            run = p.add_run()
            run.text = b_body
            run.font.bold = False
            run.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 6: API & INTEROPERABILITY ARCHITECTURE (ADAPTER PATTERN & FHIR)
    # =========================================================================
    slide6 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide6)
    add_header(slide6, "API & Interoperability Architecture: The Integration Adapter Pattern")

    # Left: Adapter Pattern Code Architecture
    create_card(slide6, 0.8, 1.6, 6.0, 5.2, bg_color=SURFACE_DARK, border_color=ACCENT_BLUE)
    tb_ap = slide6.shapes.add_textbox(Inches(1.1), Inches(1.8), Inches(5.4), Inches(4.7))
    tf_ap = tb_ap.text_frame
    tf_ap.word_wrap = True

    p = tf_ap.paragraphs[0]
    p.text = "INTEGRATION ADAPTER ARCHITECTURE"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = ACCENT_BLUE
    p.space_after = Pt(10)

    p = tf_ap.add_paragraph()
    p.text = "CareCarry avoids hard-coding hospital-specific API formats through the Adapter Pattern:\n"
    p.font.size = Pt(11)
    p.font.color.rgb = TEXT_MUTED

    code_lines = [
        "// Unified Provider Interface Contract",
        "interface HealthRecordAdapter {",
        "  patientMatch({ carecarryId, abhaId, phone });",
        "  discoverRecords({ providerMrn, carecarryId });",
        "  fetchDocument({ recordId, sourceRecordId });",
        "}",
        "",
        "// Implemented Concrete Adapters:",
        "• ApolloHisAdapter      -> Apollo Central HIS (REST/JSON)",
        "• MaxEmrAdapter         -> Max Super Specialty (FHIR R4)",
        "• FortisNetAdapter      -> Fortis Clinical Care Network",
        "• GovernmentHisAdapter  -> District e-Hospital System",
        "• AbdmGatewayAdapter    -> National Health Stack Gateway"
    ]
    for cl in code_lines:
        p = tf_ap.add_paragraph()
        p.text = cl
        p.font.size = Pt(10)
        p.font.name = "Consolas"
        p.font.color.rgb = ACCENT_CYAN if cl.startswith("•") or cl.startswith("interface") else TEXT_WHITE

    # Right: HL7 FHIR Standard Mapping
    create_card(slide6, 7.1, 1.6, 5.4, 5.2, bg_color=SURFACE_DARK, border_color=ACCENT_PURPLE)
    tb_fh = slide6.shapes.add_textbox(Inches(7.4), Inches(1.8), Inches(4.8), Inches(4.7))
    tf_fh = tb_fh.text_frame
    tf_fh.word_wrap = True

    p = tf_fh.paragraphs[0]
    p.text = "HL7 FHIR R4 RESOURCE MAPPING"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = ACCENT_PURPLE
    p.space_after = Pt(10)

    fhir_items = [
        ("FHIR Patient", "Canonical citizen demographic profile mapped to ABHA ID and internal user context."),
        ("FHIR Encounter", "Clinical interaction event at Hospital OPD/IPD with token, department, and attending doctor."),
        ("FHIR Observation", "Quantitative lab analytes (e.g. Total Cholesterol 182 mg/dL, LVEF 62%) with LOINC codes."),
        ("FHIR DiagnosticReport", "Radiology impressions, ECG findings, and pathology panels with doctor signatures."),
        ("FHIR MedicationRequest", "Structured prescription items with drug dosage, duration, and frequency instructions."),
        ("FHIR DocumentReference", "Standardized metadata pointer pointing to the source hospital document store.")
    ]
    for r_name, r_desc in fhir_items:
        p = tf_fh.add_paragraph()
        p.text = f"{r_name}: "
        p.font.bold = True
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_WHITE
        p.space_after = Pt(4)
        run = p.add_run()
        run.text = r_desc
        run.font.bold = False
        run.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 7: PATIENT DASHBOARD & ON-DEMAND STREAMING UI
    # =========================================================================
    slide7 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide7)
    add_header(slide7, "Patient Dashboard: Unified Health Timeline & On-Demand Document Streaming")

    # Left: Health Timeline UI Features
    create_card(slide7, 0.8, 1.6, 5.6, 5.2, bg_color=SURFACE_DARK, border_color=ACCENT_GREEN)
    tb_tl = slide7.shapes.add_textbox(Inches(1.1), Inches(1.8), Inches(5.0), Inches(4.7))
    tf_tl = tb_tl.text_frame
    tf_tl.word_wrap = True

    p = tf_tl.paragraphs[0]
    p.text = "UNIFIED HEALTH TIMELINE (FRONTEND)"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = ACCENT_GREEN
    p.space_after = Pt(12)

    tl_bullets = [
        ("Chronological Aggregation", "Consolidates consultations, lab reports, imaging studies, and prescriptions across all visited hospitals into a unified interactive feed."),
        ("Provider Attribution", "Each encounter clearly displays originating hospital badges (e.g. Apollo Hospitals Central, Max Healthcare, District Hospital)."),
        ("Structured Clinical Data", "Displays diagnoses, vitals, prescriptions, and official hospital discharge summaries."),
        ("Dynamic Consent Badging", "Highlights active clinician access grants with instant patient revocation capabilities.")
    ]
    for t_head, t_body in tl_bullets:
        p = tf_tl.add_paragraph()
        p.text = f"• {t_head}: "
        p.font.bold = True
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_WHITE
        p.space_after = Pt(6)
        run = p.add_run()
        run.text = t_body
        run.font.bold = False
        run.font.color.rgb = TEXT_MUTED

    # Right: On-Demand Streaming Architecture
    create_card(slide7, 6.9, 1.6, 5.6, 5.2, bg_color=SURFACE_DARK, border_color=ACCENT_CYAN)
    tb_st = slide7.shapes.add_textbox(Inches(7.2), Inches(1.8), Inches(5.0), Inches(4.7))
    tf_st = tb_st.text_frame
    tf_st.word_wrap = True

    p = tf_st.paragraphs[0]
    p.text = "ZERO-DUPLICATION STREAMING VIEWER"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = ACCENT_CYAN
    p.space_after = Pt(12)

    st_bullets = [
        ("Clinician Requests View", "Doctor clicks 'Fetch from Source HIS' in PatientClinicalView.jsx."),
        ("Gateway Authorization Check", "CareCarry verifies attending doctor's JWT credentials and patient's active consent grant."),
        ("Secure API Pipeline", "CareCarry initiates authorized HTTPS request to source hospital's HIS adapter."),
        ("Ephemeral Payload Delivery", "Clinical document (lab metrics, 2D echo findings, discharge course) is streamed live to UI."),
        ("Zero Database Persistence", "Document is rendered in memory and dismissed. CareCarry saves 0 copies to MySQL or Cloudinary.")
    ]
    for s_head, s_body in st_bullets:
        p = tf_st.add_paragraph()
        p.text = f"• {s_head}: "
        p.font.bold = True
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_WHITE
        p.space_after = Pt(6)
        run = p.add_run()
        run.text = s_body
        run.font.bold = False
        run.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 8: COLLEGE PROTOTYPE VS PRODUCTION ARCHITECTURE
    # =========================================================================
    slide8 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide8)
    add_header(slide8, "College Prototype vs. Production Architecture: Honest Technical Distinction")

    # Table comparison across 2 big cards
    create_card(slide8, 0.8, 1.6, 5.6, 5.2, bg_color=SURFACE_DARK, border_color=ACCENT_AMBER)
    tb_cp = slide8.shapes.add_textbox(Inches(1.1), Inches(1.8), Inches(5.0), Inches(4.7))
    tf_cp = tb_cp.text_frame
    tf_cp.word_wrap = True

    p = tf_cp.paragraphs[0]
    p.text = "🎓 CURRENT COLLEGE PROTOTYPE (IMPLEMENTED)"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = ACCENT_AMBER
    p.space_after = Pt(12)

    proto_items = [
        ("Simulated ABDM & HIS Adapters", "ApolloHisAdapter, MaxEmrAdapter, FortisNetAdapter, and AbdmGatewayAdapter implemented in Node.js."),
        ("Real Zero-Duplication Streaming", "Full on-demand streaming engine with live lab/cardio document payloads running on port 5000."),
        ("Dual Identity Model", "CareCarry ID (CC-XXXX) mapped with National ABHA ID (91-XXXX) in MySQL schema."),
        ("Clinical Command Center", "Live OPD triage queue, department load routing, lab ordering, pharmacy dispensing, and discharge summary."),
        ("Automated Test Verification", "100% test pass on test-interoperability.js, test-hospital-ops.js, and test-e2e.js.")
    ]
    for pi_head, pi_body in proto_items:
        p = tf_cp.add_paragraph()
        p.text = f"✔ {pi_head}: "
        p.font.bold = True
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_WHITE
        p.space_after = Pt(5)
        run = p.add_run()
        run.text = pi_body
        run.font.bold = False
        run.font.color.rgb = TEXT_MUTED

    create_card(slide8, 6.9, 1.6, 5.6, 5.2, bg_color=SURFACE_DARK, border_color=ACCENT_BLUE)
    tb_prod = slide8.shapes.add_textbox(Inches(7.2), Inches(1.8), Inches(5.0), Inches(4.7))
    tf_prod = tb_prod.text_frame
    tf_prod.word_wrap = True

    p = tf_prod.paragraphs[0]
    p.text = "🚀 FUTURE PRODUCTION ROADMAP"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = ACCENT_BLUE
    p.space_after = Pt(12)

    prod_items = [
        ("Official NHA Sandbox Integration", "Onboard onto National Health Authority (NHA) Sandbox with official client_id & client_secret."),
        ("ABDM Milestone 1 - 3 Compliance", "Milestone 1: ABHA creation/verification; Milestone 2: HIP (Health Information Provider); Milestone 3: HIU (Health Information User)."),
        ("Public Key Encryption (PKI)", "Diffie-Hellman key exchange for end-to-end encrypted health data flows between hospital gateway and patient device."),
        ("DISHA & DPDP Act Compliance", "Full adherence to India's Digital Personal Data Protection (DPDP) Act 2023 for consent artifact management."),
        ("No Code Rewrites Required", "Thanks to Adapter Pattern, switching from Mock to Production ABDM requires only updating adapter config!")
    ]
    for pr_head, pr_body in prod_items:
        p = tf_prod.add_paragraph()
        p.text = f"➔ {pr_head}: "
        p.font.bold = True
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_WHITE
        p.space_after = Pt(5)
        run = p.add_run()
        run.text = pr_body
        run.font.bold = False
        run.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 9: WHY THIS MAKES CARECARRY MEANINGFUL
    # =========================================================================
    slide9 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide9)
    add_header(slide9, "Conclusion: Why This Model Makes CareCarry Defensible & Meaningful")

    # 3 Summary Pillar Cards
    pillars = [
        ("1. The Core Justification", ACCENT_BLUE, [
            ("The Real Problem", "Hospitals already possess databases. The core problem is that a patient's records are fragmented across government hospitals, private clinics, and diagnostic labs."),
            ("CareCarry's True Purpose", "CareCarry becomes the consent-driven access layer connecting identity, consent, and record discovery into a unified citizen health dashboard."),
            ("One-Sentence Definition", "CareCarry is a patient-centric dashboard providing a unified view of a citizen's authorized health records obtained through India's digital health interoperability ecosystem.")
        ]),
        ("2. Defending Tough Questions", ACCENT_GREEN, [
            ("Q: Why would a hospital use CareCarry?", "A: They don't need to replace their EMR. CareCarry is an interoperability client that discovers permitted records via approved APIs."),
            ("Q: How does this prevent data leaks?", "A: Zero permanent file duplication. CareCarry holds references; source records stay encrypted inside provider databases."),
            ("Q: What if hospital formats differ?", "A: The Integration Adapter Pattern normalizes diverse hospital data into standard HL7 FHIR resources.")
        ]),
        ("3. Software Engineering Merit", ACCENT_PURPLE, [
            ("Real Architectural Depth", "Elevates CareCarry from a trivial 'CRUD file uploader' into a distributed interoperability gateway project."),
            ("Production-Ready Design", "Clean separation of concerns: REST API Gateway, Adapter Pattern, RBAC Auth, Identity Mapping, and Longitudinal Timeline UI."),
            ("Proven Implementation", "100% verified working prototype with MySQL database migrations, Node.js gateway, and React frontend.")
        ])
    ]

    for idx, (p_title, p_col, p_bullets) in enumerate(pillars):
        x = 0.8 + idx * 3.95
        create_card(slide9, x, 1.6, 3.8, 5.2, bg_color=SURFACE_DARK, border_color=p_col)
        tb_p = slide9.shapes.add_textbox(Inches(x + 0.2), Inches(1.8), Inches(3.4), Inches(4.7))
        tf_p = tb_p.text_frame
        tf_p.word_wrap = True

        p = tf_p.paragraphs[0]
        p.text = p_title
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = p_col
        p.space_after = Pt(14)

        for b_t, b_d in p_bullets:
            p = tf_p.add_paragraph()
            p.text = f"{b_t}: "
            p.font.bold = True
            p.font.size = Pt(11)
            p.font.color.rgb = TEXT_WHITE
            p.space_after = Pt(6)
            run = p.add_run()
            run.text = b_d
            run.font.bold = False
            run.font.color.rgb = TEXT_MUTED

    # Save presentation
    output_path = os.path.abspath("CareCarry_ABDM_Interoperability_Presentation.pptx")
    prs.save(output_path)
    print(f"Presentation successfully created at: {output_path}")

if __name__ == "__main__":
    create_presentation()
