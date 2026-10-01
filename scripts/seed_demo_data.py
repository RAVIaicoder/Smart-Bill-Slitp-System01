"""
Seed Realistic Demo Data for Smart Split Bill Demonstration.
Users: Rahul Sharma, Amit Patel, Priya Singh, Neha Verma, Admin User
Groups: Goa Trip 2026, Flat 402 Expenses, College Tech Fest
Bills, items, equal/percentage/exact splits, payments, chats, and notifications.
"""
import sqlite3
import os
import hashlib
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "database", "smart_split_bill.db")

def hash_pw(pwd: str) -> str:
    # Deterministic SHA256 with salt for college demo seed
    return hashlib.sha256(f"salt_{pwd}".encode()).hexdigest()

def seed():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Clear existing demo data
    cur.execute("DELETE FROM audit_logs")
    cur.execute("DELETE FROM notifications")
    cur.execute("DELETE FROM group_messages")
    cur.execute("DELETE FROM payments")
    cur.execute("DELETE FROM bill_splits")
    cur.execute("DELETE FROM bill_items")
    cur.execute("DELETE FROM bills")
    cur.execute("DELETE FROM group_members")
    cur.execute("DELETE FROM groups")
    cur.execute("DELETE FROM budgets")
    cur.execute("DELETE FROM user_profiles")
    cur.execute("DELETE FROM users")

    # 1. Users
    users_data = [
        ("demo@smartsplitbill.local", "+919876543210", hash_pw("Demo@12345"), "user", "Rahul Sharma", "rahul@oksbi", "INR"),
        ("amit@smartsplitbill.local", "+919876543211", hash_pw("Demo@12345"), "user", "Amit Patel", "amit@okhdfc", "INR"),
        ("priya@smartsplitbill.local", "+919876543212", hash_pw("Demo@12345"), "user", "Priya Singh", "priya@okaxis", "INR"),
        ("neha@smartsplitbill.local", "+919876543213", hash_pw("Demo@12345"), "user", "Neha Verma", "neha@okicici", "INR"),
        ("admin@smartsplitbill.local", "+919876543299", hash_pw("Admin@12345"), "admin", "System Administrator", "admin@upi", "INR"),
    ]

    user_ids = {}
    for email, phone, hpw, role, name, upi, cur_sym in users_data:
        cur.execute("INSERT INTO users (email, phone, hashed_password, role, is_active) VALUES (?, ?, ?, ?, 1)", (email, phone, hpw, role))
        uid = cur.lastrowid
        user_ids[name] = uid
        cur.execute("INSERT INTO user_profiles (user_id, full_name, upi_id, currency, theme_preference) VALUES (?, ?, ?, ?, 'system')", (uid, name, upi, cur_sym))

    # 2. Groups
    cur.execute("INSERT INTO groups (name, description, currency, created_by) VALUES (?, ?, ?, ?)",
                ("Goa Trip 2026", "Beach resort, water sports, scooty rentals and seafood shacks", "INR", user_ids["Rahul Sharma"]))
    g_goa = cur.lastrowid

    cur.execute("INSERT INTO groups (name, description, currency, created_by) VALUES (?, ?, ?, ?)",
                ("Flat 402 Expenses", "Monthly groceries, WiFi, maid charges, and electricity", "INR", user_ids["Amit Patel"]))
    g_flat = cur.lastrowid

    cur.execute("INSERT INTO groups (name, description, currency, created_by) VALUES (?, ?, ?, ?)",
                ("College Tech Fest", "Robotics kit, banner printing, and team dinner", "INR", user_ids["Priya Singh"]))
    g_tech = cur.lastrowid

    # 3. Group Members
    for name in ["Rahul Sharma", "Amit Patel", "Priya Singh", "Neha Verma"]:
        cur.execute("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)",
                    (g_goa, user_ids[name], "admin" if name == "Rahul Sharma" else "member"))
        cur.execute("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)",
                    (g_flat, user_ids[name], "admin" if name == "Amit Patel" else "member"))

    cur.execute("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'admin')", (g_tech, user_ids["Priya Singh"]))
    cur.execute("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')", (g_tech, user_ids["Rahul Sharma"]))

    # 4. Bills & Splits
    # Bill 1: Seafood Dinner at Calangute (Paid by Rahul = 4,000 INR, Equal split)
    cur.execute("INSERT INTO bills (group_id, paid_by, title, description, total_amount, category, split_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (g_goa, user_ids["Rahul Sharma"], "Calangute Seafood Dinner", "Tiger prawns, fish curry, fried rice and beverages", 4000.0, "Food", "equal"))
    b1 = cur.lastrowid
    cur.execute("INSERT INTO bill_items (bill_id, item_name, unit_price, quantity, total_price) VALUES (?, ?, ?, ?, ?)", (b1, "Grilled Tiger Prawns", 1200.0, 1, 1200.0))
    cur.execute("INSERT INTO bill_items (bill_id, item_name, unit_price, quantity, total_price) VALUES (?, ?, ?, ?, ?)", (b1, "Goan Fish Curry Rice", 400.0, 4, 1600.0))
    cur.execute("INSERT INTO bill_items (bill_id, item_name, unit_price, quantity, total_price) VALUES (?, ?, ?, ?, ?)", (b1, "Mocktails & Fresh Juices", 250.0, 4, 1000.0))
    cur.execute("INSERT INTO bill_items (bill_id, item_name, unit_price, quantity, total_price) VALUES (?, ?, ?, ?, ?)", (b1, "Service Charges", 200.0, 1, 200.0))
    for name in ["Rahul Sharma", "Amit Patel", "Priya Singh", "Neha Verma"]:
        cur.execute("INSERT INTO bill_splits (bill_id, user_id, owed_amount, percentage, shares, is_settled) VALUES (?, ?, ?, ?, 1, ?)",
                    (b1, user_ids[name], 1000.0, 25.0, 1 if name == "Rahul Sharma" else 0))

    # Bill 2: Scooty Rental (Paid by Amit = 2,400 INR, Exact split)
    cur.execute("INSERT INTO bills (group_id, paid_by, title, description, total_amount, category, split_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (g_goa, user_ids["Amit Patel"], "Activa Scooty Rentals (3 Days)", "2 Activa scooters for 3 days travel", 2400.0, "Travel", "equal"))
    b2 = cur.lastrowid
    for name in ["Rahul Sharma", "Amit Patel", "Priya Singh", "Neha Verma"]:
        cur.execute("INSERT INTO bill_splits (bill_id, user_id, owed_amount, percentage, shares, is_settled) VALUES (?, ?, ?, ?, 1, ?)",
                    (b2, user_ids[name], 600.0, 25.0, 1 if name == "Amit Patel" else 0))

    # Bill 3: Flat High-Speed WiFi & Netflix (Paid by Priya = 1,600 INR)
    cur.execute("INSERT INTO bills (group_id, paid_by, title, description, total_amount, category, split_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (g_flat, user_ids["Priya Singh"], "300 Mbps Fiber WiFi + OTT", "Airtel Xstream fiber monthly renewal", 1600.0, "Utilities", "equal"))
    b3 = cur.lastrowid
    for name in ["Rahul Sharma", "Amit Patel", "Priya Singh", "Neha Verma"]:
        cur.execute("INSERT INTO bill_splits (bill_id, user_id, owed_amount, percentage, shares, is_settled) VALUES (?, ?, ?, ?, 1, ?)",
                    (b3, user_ids[name], 400.0, 25.0, 1 if name == "Priya Singh" else 0))

    # 5. Payments
    cur.execute("INSERT INTO payments (group_id, payer_id, payee_id, amount, payment_method, transaction_ref, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (g_goa, user_ids["Neha Verma"], user_ids["Rahul Sharma"], 1000.0, "UPI", "UPI-REF-902341829", "Paid"))

    # 6. Group Chat messages
    chat_events = [
        (g_goa, user_ids["Rahul Sharma"], "Welcome everyone to Goa Trip 2026 expense pool!", 1),
        (g_goa, user_ids["Rahul Sharma"], "I have added ₹4,000 for Calangute seafood dinner receipt.", 0),
        (g_goa, user_ids["Amit Patel"], "Paid ₹2,400 for our 2 Activa scooters. Added bill!", 0),
        (g_goa, user_ids["Neha Verma"], "I have sent ₹1,000 to Rahul via GPay UPI!", 0),
        (g_flat, user_ids["Priya Singh"], "WiFi bill renewed for 300 Mbps fiber.", 0),
    ]
    for gid, uid, msg, sys_flag in chat_events:
        cur.execute("INSERT INTO group_messages (group_id, user_id, message_text, is_system_event) VALUES (?, ?, ?, ?)",
                    (gid, uid, msg, sys_flag))

    # 7. Budget for Rahul
    cur.execute("INSERT INTO budgets (user_id, month, year, monthly_limit) VALUES (?, ?, ?, ?)",
                (user_ids["Rahul Sharma"], datetime.now().month, datetime.now().year, 25000.0))

    # 8. Notifications
    cur.execute("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
                (user_ids["Rahul Sharma"], "Payment Received", "Neha Verma sent ₹1,000 via UPI (Ref: UPI-REF-902341829)", "payment"))
    cur.execute("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
                (user_ids["Rahul Sharma"], "New Bill Added", "Amit Patel added 'Activa Scooty Rentals' in Goa Trip 2026", "bill"))

    # 9. Audit Log
    cur.execute("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
                (user_ids["Rahul Sharma"], "CREATE_BILL", "Bill", b1, "Created bill: Calangute Seafood Dinner (₹4,000)"))

    conn.commit()
    conn.close()
    print("Demo data seeded successfully into SQLite database!")

if __name__ == "__main__":
    seed()
