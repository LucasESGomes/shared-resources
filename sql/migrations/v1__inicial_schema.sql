-- Criando um SCHEMA para reservas
CREATE SCHEMA booking;

CREATE TYPE user_status AS ENUM ('active', 'inactive');
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- Criando a tabela de usuários
CREATE TABLE booking.users (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	name VARCHAR(100) NOT NULL,
	email VARCHAR(255) UNIQUE NOT NULL,
	password_hash TEXT NOT NULL, 
	role user_role DEFAULT 'user',
	photo_url TEXT,
	isactive user_status DEFAULT 'active',
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TYPE resources_type AS ENUM ('room', 'equipment');
CREATE TYPE resource_status AS ENUM ('available', 'maintenance', 'out_of_service', 'reserved_for_admin');

-- Criando a tabela dos espaços/equipamentos
CREATE TABLE booking.resources (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	name VARCHAR(100) NOT NULL,
	quantity INTEGER NOT NULL,
	type resources_type DEFAULT 'room',
	location TEXT,
	status resource_status DEFAULT 'available',
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW(),
	CHECK (type = 'room' AND quantity = 1 OR type = 'equipment')
);


CREATE TYPE reservation_status AS ENUM ('active', 'inactive');

-- Criando a tabela das reservas
CREATE TABLE booking.reservations (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	user_id UUID REFERENCES booking.users(id),
	resource_id UUID REFERENCES booking.resources(id),
	start_time TIMESTAMPTZ NOT NULL,
	end_time TIMESTAMPTZ NOT NULL,
	status reservation_status DEFAULT 'active',
	quantity_reserved INTEGER DEFAULT 1,
	idempotency_key UUID UNIQUE NOT NULL,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW(),
	
	-- Checa se o tempo de termino não é menor do que o tempo de inicio
	CONSTRAINT check_reservation_dated CHECK (end_time > start_time)
);


CREATE TABLE booking.refresh_tokens (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	user_id UUID REFERENCES booking.users(id) NOT NULL,
	token_hash TEXT UNIQUE NOT NULL,
	expires_at TIMESTAMPTZ NOT NULL,
	revoked BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMPTZ DEFAULT NOW(),

	-- Garantindo o user_id para gerar o refresh_token
	CONSTRAINT user_refreseh_token FOREIGN KEY(user_id) REFERENCES booking.users(id) ON DELETE CASCADE
);


-- Otimizando e performance do banco
CREATE INDEX idx_reservations_resource_time 
ON booking.reservations (resource_id, start_time, end_time);

CREATE INDEX idx_reservations_user 
ON booking.reservations (user_id);

CREATE INDEX idx_refresh_tokens
ON booking.refresh_tokens (token_hash);



--------------INSERTS--------------
-- INSERT booking.users
INSERT INTO booking.users(name, email, password_hash, role, isactive)
VALUES
	('Pablo Henrique', 'pablohenrique@gmail.com', '1234', DEFAULT, DEFAULT),
	('Lucas Gomes', 'lucasgomes@gmail.com', '1234', 'admin', DEFAULT),
	('Otávio Vinicius', 'otaviovinicius@gmail.com', '1234', DEFAULT, 'inactive');

-- INSERT booking.resources
INSERT INTO booking.resources(name, quantity, type, location, status)
	VALUES
		('Lab 1', 1, DEFAULT, '1T-13', DEFAULT),
		('Notebook Lenovo', 20, 'equipment', 'Biblioteca', DEFAULT),
		('Biblioteca', 1, DEFAULT, '2T-03', DEFAULT);

-- INSERT booking.reservations
INSERT INTO booking.reservations(user_id, resource_id, start_time, end_time, status, quantity_reserved,
idempotency_key)
	VALUES
		('eedd7f7d-0053-4ea0-aa7a-f1d2b5767b57', 'b77f730b-602f-487e-867c-eaeab437e6dd', NOW(), 
		'2026-05-03 06:00:00', DEFAULT, DEFAULT, 'abc123'),
		('58ccfca4-9803-4b6d-824f-d49af58bcc14', '5d3a9893-bb3e-4349-bb40-471887d847f7', now(),
		'2026-05-03 02:00:00', DEFAULT, 2, 'abc124'),
		('74124622-a4ff-44e7-a6d8-34903335802e', '4a506b55-0713-4d41-ad5b-9327231f27f2', now(),
		'2026-05-03 07:30:00', DEFAULT, DEFAULT, 'abc125')
ON CONFLICT (idempotency_key) DO NOTHING;