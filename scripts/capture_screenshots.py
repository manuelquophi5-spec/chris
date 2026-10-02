import os
import time
import json
import urllib.request
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = os.path.join(os.getcwd(), "docs", "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
BASE_URL = "http://127.0.0.1:3001"

def get_session_token(endpoint, payload):
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    res = urllib.request.urlopen(req)
    cookie_hdr = res.headers.get("Set-Cookie")
    token = cookie_hdr.split("ella_session=")[1].split(";")[0]
    return token

def run():
    print("Obtaining Admin session token...")
    admin_token = get_session_token("/api/auth/admin/login", {
        "email": "admin@ug.edu.gh",
        "password": "AdminPassword123"
    })

    print("Obtaining Student session token...")
    student_token = get_session_token("/api/auth/login", {
        "studentId": "STU001",
        "password": "Student12345"
    })

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=EDGE_PATH, headless=True)

        # ----------------------------------------------------
        # Part A: Public Pages (Desktop 1440x900)
        # ----------------------------------------------------
        pub_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = pub_ctx.new_page()

        print("[1/17] Capturing Student Sign In...")
        page.goto(f"{BASE_URL}/login", wait_until="domcontentloaded")
        time.sleep(1.5)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "01_student_login.png"))

        print("[2/17] Capturing Admin Sign In...")
        page.goto(f"{BASE_URL}/login/admin", wait_until="domcontentloaded")
        time.sleep(1.5)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "02_admin_login.png"))

        print("[3/17] Capturing Set Password Page...")
        page.goto(f"{BASE_URL}/set-password", wait_until="domcontentloaded")
        time.sleep(1.5)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "03_set_password.png"))

        print("[4/17] Capturing Register Page...")
        page.goto(f"{BASE_URL}/register", wait_until="domcontentloaded")
        time.sleep(1.5)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "04_register.png"))

        print("[5/17] Capturing QR Scan Page...")
        page.goto(f"{BASE_URL}/scan", wait_until="domcontentloaded")
        time.sleep(1.5)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "05_qr_scan.png"))

        pub_ctx.close()

        # ----------------------------------------------------
        # Part B: Admin Pages (Desktop 1440x900)
        # ----------------------------------------------------
        admin_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        admin_ctx.add_cookies([{
            "name": "ella_session",
            "value": admin_token,
            "domain": "127.0.0.1",
            "path": "/"
        }])
        admin_page = admin_ctx.new_page()

        print("[6/17] Capturing Admin Start Here / Overview...")
        admin_page.goto(f"{BASE_URL}/dashboard/admin", wait_until="domcontentloaded")
        time.sleep(2)
        admin_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "06_admin_start_here.png"))

        print("[7/17] Capturing Admin Campuses / Geofence Sites...")
        admin_page.goto(f"{BASE_URL}/dashboard/admin/sites", wait_until="domcontentloaded")
        time.sleep(4) # Wait for Leaflet map tiles
        admin_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "07_admin_campuses.png"))

        print("[8/17] Capturing Admin Students & Staff...")
        admin_page.goto(f"{BASE_URL}/dashboard/admin/users", wait_until="domcontentloaded")
        time.sleep(2)
        admin_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "08_admin_users.png"))

        print("[9/17] Capturing Admin Classes & Timetables...")
        admin_page.goto(f"{BASE_URL}/dashboard/admin/courses", wait_until="domcontentloaded")
        time.sleep(2)
        admin_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "09_admin_courses.png"))

        print("[10/17] Capturing Course Details with QR & Enrollment...")
        try:
            course_btn = admin_page.locator("button:has-text('Introduction to Computing')").first
            if course_btn.count() > 0:
                course_btn.click()
                time.sleep(2)
            admin_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "10_admin_course_details_qr.png"))
        except Exception as e:
            print("Course click note:", e)
            admin_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "10_admin_course_details_qr.png"))

        print("[11/17] Capturing Admin Attendance Log...")
        admin_page.goto(f"{BASE_URL}/dashboard/admin/attendance", wait_until="domcontentloaded")
        time.sleep(2)
        admin_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "11_admin_attendance_log.png"))

        print("[12/17] Capturing Admin One-Off Sessions...")
        admin_page.goto(f"{BASE_URL}/dashboard/admin/sessions", wait_until="domcontentloaded")
        time.sleep(2)
        admin_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "12_admin_sessions.png"))

        print("[13/17] Capturing Admin Activity History / Audit Log...")
        admin_page.goto(f"{BASE_URL}/dashboard/admin/audit", wait_until="domcontentloaded")
        time.sleep(2)
        admin_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "13_admin_audit.png"))

        print("[14/17] Capturing Admin Branding Settings...")
        admin_page.goto(f"{BASE_URL}/dashboard/admin/settings", wait_until="domcontentloaded")
        time.sleep(2)
        admin_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "14_admin_settings.png"))

        admin_ctx.close()

        # ----------------------------------------------------
        # Part C: Student Mobile View (414x896)
        # ----------------------------------------------------
        print("[15/17] Capturing Student Mobile Dashboard...")
        mob_ctx = browser.new_context(
            viewport={"width": 414, "height": 896},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
            is_mobile=True,
            has_touch=True,
            permissions=["geolocation"],
            geolocation={"latitude": 5.6502, "longitude": -0.1962}
        )
        mob_ctx.add_cookies([{
            "name": "ella_session",
            "value": student_token,
            "domain": "127.0.0.1",
            "path": "/"
        }])
        mob_page = mob_ctx.new_page()

        mob_page.goto(f"{BASE_URL}/dashboard", wait_until="domcontentloaded")
        time.sleep(2.5)
        mob_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "15_student_dashboard_mobile.png"))

        print("[16/17] Capturing Student Mobile History...")
        mob_page.goto(f"{BASE_URL}/dashboard/history", wait_until="domcontentloaded")
        time.sleep(2)
        mob_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "16_student_history_mobile.png"))

        mob_ctx.close()

        # ----------------------------------------------------
        # Part D: Student Desktop View (1280x800)
        # ----------------------------------------------------
        print("[17/17] Capturing Student Desktop View...")
        stu_desk_ctx = browser.new_context(
            viewport={"width": 1280, "height": 800},
            permissions=["geolocation"],
            geolocation={"latitude": 5.6502, "longitude": -0.1962}
        )
        stu_desk_ctx.add_cookies([{
            "name": "ella_session",
            "value": student_token,
            "domain": "127.0.0.1",
            "path": "/"
        }])
        stu_desk_page = stu_desk_ctx.new_page()
        stu_desk_page.goto(f"{BASE_URL}/dashboard", wait_until="domcontentloaded")
        time.sleep(2)
        stu_desk_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "17_student_dashboard_desktop.png"))
        stu_desk_ctx.close()

        browser.close()
        print("\nAll 17 high-resolution screenshots have been captured successfully!")

if __name__ == "__main__":
    run()
