-- Seed Data for JourneyLink Testing
-- Insert Demo User (Password is 'password')
INSERT INTO users (id, name, email, password, created_at)
VALUES (
    'a53b5168-7c80-4965-8b43-7f2878bf80f1',
    'Demo User',
    'demo@journeylink.com',
    '$2a$10$ByI/6p8I0vU9d8f3O2jU4O8g.tWnBq6gqU0z3x.c/P3p0R5.aRjR2',
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Insert a completed journey for Demo User
INSERT INTO journeys (id, user_id, journey_name, tracking_code, start_lat, start_lng, destination_lat, destination_lng, start_time, end_time, status, password_hash, expires_at, start_address, destination_address, travel_mode)
VALUES (
    '87a53f81-229d-43ef-ba88-e215fa1d2938',
    'a53b5168-7c80-4965-8b43-7f2878bf80f1',
    'Commute to Office',
    'demo1234',
    17.3850,
    78.4867,
    17.4483,
    78.3741,
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    CURRENT_TIMESTAMP - INTERVAL '30 minutes',
    'COMPLETED',
    NULL,
    NULL,
    'Charminar, Hyderabad, Telangana, India',
    'DLF Cyber City, Gachibowli, Hyderabad, Telangana, India',
    'DRIVING'
) ON CONFLICT (tracking_code) DO NOTHING;

-- Insert location logs for the journey
INSERT INTO location_logs (id, journey_id, latitude, longitude, speed, timestamp)
VALUES 
    ('3c1b5a2e-4b21-4876-b922-8356d20398ba', '87a53f81-229d-43ef-ba88-e215fa1d2938', 17.3850, 78.4867, 0.0, CURRENT_TIMESTAMP - INTERVAL '58 minutes'),
    ('3c2b5a2e-4b21-4876-b922-8356d20398bb', '87a53f81-229d-43ef-ba88-e215fa1d2938', 17.4000, 78.4400, 42.5, CURRENT_TIMESTAMP - INTERVAL '50 minutes'),
    ('3c3b5a2e-4b21-4876-b922-8356d20398bc', '87a53f81-229d-43ef-ba88-e215fa1d2938', 17.4200, 78.4000, 55.0, CURRENT_TIMESTAMP - INTERVAL '40 minutes'),
    ('3c4b5a2e-4b21-4876-b922-8356d20398bd', '87a53f81-229d-43ef-ba88-e215fa1d2938', 17.4483, 78.3741, 12.0, CURRENT_TIMESTAMP - INTERVAL '31 minutes')
ON CONFLICT (id) DO NOTHING;
