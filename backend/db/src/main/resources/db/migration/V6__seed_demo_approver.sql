-- =============================================================================
-- Sprint 6 — seed a second demo user so the 4-eyes withdrawal flow can be
-- exercised end-to-end without an admin tool.
--
-- Demo credentials (same password as `demo`):
--   merchant.code = 'DEMO'
--   user          = 'demo_approver'
--   password      = 'ObitaDemo!2026'
--
-- The approver holds MERCHANT_ADMIN + RISK_REVIEWER (no MERCHANT_OPERATOR) so
-- the demo also illustrates separation of duties: `demo` requests, the
-- approver signs off.
-- =============================================================================

INSERT INTO app_user (id, merchant_id, username, password_hash, roles, status) VALUES
    ('00000000-0000-0000-0000-000000000012',
     '00000000-0000-0000-0000-000000000010',
     'demo_approver',
     '$argon2id$v=19$m=65536,t=3,p=2$ZGVtby1zYWx0LXBsYWNlaG9sZGVy$0J9kpI9k8H4bF0bz4mJ0qEXZbEXBP9lLk9vp9dG3T9w',
     ARRAY['MERCHANT_ADMIN','RISK_REVIEWER'],
     'ACTIVE')
ON CONFLICT (id) DO NOTHING;
