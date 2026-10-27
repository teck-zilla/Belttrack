# PostgreSQL Database Connection String
# Reason: Prisma requires a valid connection URI to compile the client and execute queries.
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/belttrack_dev?schema=public"

# Standalone Static Preview Server Port
# Reason: server.js reads this port to launch the vanilla HTML preview environment.
PORT=3000

# Application Environment Mode
# Reason: Next.js and logging libraries use this flag to toggle development behaviors.
NODE_ENV="development"