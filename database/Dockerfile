FROM postgres:18-alpine

# Optional: Install additional extensions or packages (e.g., PostGIS)
# RUN apk add --no-cache postgis

COPY ./init-scripts/ /docker-entrypoint-initdb.d/

# COPY postgresql.conf /etc/postgresql/postgresql.conf
# CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]

EXPOSE 5432
