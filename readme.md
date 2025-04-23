# Notable

A book notes app ...

## Requirements

### Node

## Setup
Use `npm i` to initialize the project.

Run the project using `node index.js`.

Server running on port `http://localhost:3000/`.

## Design document
See design document [here](docs/design/notable-design-doc.pdf).

## CRUD Functionality (PostgreSQL)
Table Schema

### Create
```
await db.query(`
	INSERT INTO books (title, author, isbn, short_description, notes, rating, date_read)
	VALUES ($1, $2, $3, $4, $5, $6, $7)
	RETURNING id;
`,
[title, author, isbn, new_short_description || null, new_notes || null, parseInt(rating) || null, new Date(date_read).toISOString().slice(0, 10)]);
```

### Read

### Update

### Delete

## API - OpenLibrary Cover
See documentation [here](https://openlibrary.org/dev/docs/api/covers).

## Test plan
See test plan [here](docs/test_plan/test_plan.md).

## Further improvements
- Scalability: allow users to log in and manage their book lists. Allow sharing the list with other users.