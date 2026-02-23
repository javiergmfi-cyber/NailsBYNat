-- ============================================
-- Nails by Natalia — Database Schema
-- ============================================

-- 1. Services catalog
CREATE TABLE services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category      TEXT NOT NULL CHECK (category IN ('nails', 'babysitting')),
  name          TEXT NOT NULL,
  description   TEXT,
  duration_min  INTEGER NOT NULL,
  price_cents   INTEGER NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_services_category ON services(category) WHERE is_active = true;

-- 2. Availability rules (recurring patterns)
CREATE TABLE availability_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  slot_duration   INTEGER NOT NULL DEFAULT 30,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  effective_from  DATE,
  effective_until DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- 3. Availability slots (materialized from rules)
CREATE TABLE availability_slots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  status      TEXT NOT NULL DEFAULT 'available'
              CHECK (status IN ('available', 'booked', 'blocked')),
  rule_id     UUID REFERENCES availability_rules(id) ON DELETE SET NULL,
  booking_id  UUID,  -- FK added after bookings table
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_slot UNIQUE (date, start_time, end_time)
);

CREATE INDEX idx_slots_available ON availability_slots(date, status)
  WHERE status = 'available';
CREATE INDEX idx_slots_date_range ON availability_slots(date);

-- 4. Bookings
CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_ids          UUID[] NOT NULL,
  service_id        UUID NOT NULL REFERENCES services(id),
  category          TEXT NOT NULL CHECK (category IN ('nails', 'babysitting')),
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled', 'completed')),
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT NOT NULL,
  customer_email    TEXT NOT NULL,
  customer_notes    TEXT,
  num_children      INTEGER,
  children_ages     TEXT,
  address           TEXT,
  admin_notes       TEXT,
  decline_reason    TEXT,
  confirmed_at      TIMESTAMPTZ,
  declined_at       TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_status ON bookings(status, created_at DESC);
CREATE INDEX idx_bookings_customer ON bookings(customer_email, created_at DESC);

-- Add FK from slots to bookings
ALTER TABLE availability_slots
  ADD CONSTRAINT fk_slot_booking
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

-- 5. Notification log
CREATE TABLE booking_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
    'new_request', 'confirmed', 'declined', 'cancelled_by_customer', 'reminder'
  )),
  channel     TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  recipient   TEXT NOT NULL,
  sent_at     TIMESTAMPTZ,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_notifications ENABLE ROW LEVEL SECURITY;

-- Public: read active services
CREATE POLICY "Public read active services"
  ON services FOR SELECT USING (is_active = true);

-- Public: read available slots
CREATE POLICY "Public read available slots"
  ON availability_slots FOR SELECT USING (status = 'available');

-- Public: create bookings (validated server-side)
CREATE POLICY "Public create bookings"
  ON bookings FOR INSERT WITH CHECK (true);

-- Admin: full access (authenticated)
CREATE POLICY "Admin full services" ON services FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full rules" ON availability_rules FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full slots" ON availability_slots FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full bookings" ON bookings FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full notifications" ON booking_notifications FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================
-- Functions
-- ============================================

-- Atomic slot claim (prevents double-booking)
CREATE OR REPLACE FUNCTION claim_consecutive_slots(
  p_slot_ids UUID[],
  p_service_id UUID,
  p_category TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_customer_notes TEXT DEFAULT NULL,
  p_num_children INTEGER DEFAULT NULL,
  p_children_ages TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_locked_count INTEGER;
  v_booking_id UUID;
BEGIN
  -- Atomically lock all requested slots
  SELECT COUNT(*) INTO v_locked_count
  FROM availability_slots
  WHERE id = ANY(p_slot_ids)
    AND status = 'available'
  FOR UPDATE;

  -- All slots must be available
  IF v_locked_count != array_length(p_slot_ids, 1) THEN
    RETURN NULL;
  END IF;

  -- Create the booking
  INSERT INTO bookings (
    slot_ids, service_id, category,
    customer_name, customer_phone, customer_email, customer_notes,
    num_children, children_ages, address
  ) VALUES (
    p_slot_ids, p_service_id, p_category,
    p_customer_name, p_customer_phone, p_customer_email, p_customer_notes,
    p_num_children, p_children_ages, p_address
  )
  RETURNING id INTO v_booking_id;

  -- Mark all slots as booked
  UPDATE availability_slots
  SET status = 'booked', booking_id = v_booking_id
  WHERE id = ANY(p_slot_ids);

  RETURN v_booking_id;
END;
$$;

-- Cancel booking and release slots
CREATE OR REPLACE FUNCTION cancel_booking(p_booking_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot_ids UUID[];
BEGIN
  -- Get slot IDs and cancel the booking
  UPDATE bookings
  SET status = 'cancelled', cancelled_at = now(), updated_at = now()
  WHERE id = p_booking_id AND status IN ('pending', 'confirmed')
  RETURNING slot_ids INTO v_slot_ids;

  IF v_slot_ids IS NULL THEN
    RETURN false;
  END IF;

  -- Release all slots
  UPDATE availability_slots
  SET status = 'available', booking_id = NULL
  WHERE id = ANY(v_slot_ids);

  RETURN true;
END;
$$;

-- Generate slots from rules
CREATE OR REPLACE FUNCTION generate_slots(p_days_ahead INTEGER DEFAULT 28)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rule RECORD;
  v_date DATE;
  v_slot_start TIME;
  v_slot_end TIME;
  v_count INTEGER := 0;
  v_inserted INTEGER;
BEGIN
  FOR v_rule IN
    SELECT * FROM availability_rules WHERE is_active = true
  LOOP
    FOR v_date IN
      SELECT d::DATE FROM generate_series(
        CURRENT_DATE,
        CURRENT_DATE + p_days_ahead,
        '1 day'::INTERVAL
      ) AS d
    LOOP
      IF EXTRACT(DOW FROM v_date) != v_rule.day_of_week THEN
        CONTINUE;
      END IF;

      IF v_rule.effective_from IS NOT NULL AND v_date < v_rule.effective_from THEN
        CONTINUE;
      END IF;
      IF v_rule.effective_until IS NOT NULL AND v_date > v_rule.effective_until THEN
        CONTINUE;
      END IF;

      v_slot_start := v_rule.start_time;
      WHILE v_slot_start + (v_rule.slot_duration || ' minutes')::INTERVAL <= v_rule.end_time LOOP
        v_slot_end := (v_slot_start + (v_rule.slot_duration || ' minutes')::INTERVAL)::TIME;

        INSERT INTO availability_slots (date, start_time, end_time, rule_id)
        VALUES (v_date, v_slot_start, v_slot_end, v_rule.id)
        ON CONFLICT (date, start_time, end_time) DO NOTHING;

        GET DIAGNOSTICS v_inserted = ROW_COUNT;
        v_count := v_count + v_inserted;
        v_slot_start := v_slot_end;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ============================================
-- Seed data: sample services
-- ============================================

INSERT INTO services (category, name, description, duration_min, price_cents, sort_order) VALUES
  ('nails', 'Classic Manicure', 'Shape, buff, cuticle care, and polish', 30, 3500, 1),
  ('nails', 'Gel Manicure', 'Long-lasting gel polish with a flawless finish', 45, 5500, 2),
  ('nails', 'Classic Pedicure', 'Relaxing foot soak, exfoliation, and polish', 45, 4500, 3),
  ('nails', 'Gel Pedicure', 'Gel polish pedicure for lasting color', 60, 6500, 4),
  ('nails', 'Full Set Acrylics', 'Custom acrylic nail extensions', 90, 7500, 5),
  ('nails', 'Acrylic Fill', 'Maintenance fill for existing acrylics', 60, 5000, 6),
  ('nails', 'Nail Art Add-On', 'Custom designs, rhinestones, and embellishments', 30, 2000, 7),
  ('babysitting', 'Babysitting (2 hours)', 'Attentive care for your little ones', 120, 5000, 1),
  ('babysitting', 'Babysitting (4 hours)', 'Half-day childcare', 240, 9000, 2),
  ('babysitting', 'Babysitting (Full Day)', 'Full-day care (8 hours)', 480, 16000, 3);
