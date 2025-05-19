up:
	stripe listen --forward-to localhost:3080/api/stripe/webhook & docker compose -f docker-compose.yml -f docker-compose.override.yml up --build

down:
	docker compose -f docker-compose.yml -f docker-compose.override.yml down

sh-api:
	docker compose -f docker-compose.yml -f docker-compose.override.yml exec api sh

sh-client:
	docker compose -f docker-compose.yml -f docker-compose.override.yml exec client sh

install:
	docker compose -f docker-compose.yml -f docker-compose.override.yml run --rm api npm install

logs:
	docker compose -f docker-compose.yml -f docker-compose.override.yml logs -f

rebuild:
	docker compose -f docker-compose.yml -f docker-compose.override.yml build --no-cache

.PHONY: up down sh-api sh-client install logs rebuild