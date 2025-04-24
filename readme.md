# Notable

A book notes app ...

## Requirements

For development, you will only need Node.js and a node global package, Yarn, installed in your environement.

## Setup
Use `npm i` to initialize the project.

Run the project using `node index.js`.

Server running on port `http://localhost:3000/`.

## Design document
See design document [here](docs/design/notable-design-doc.pdf).

## CRUD Functionality (PostgreSQL)
Books table schema

![Books table](docs/database_books.png)

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

Fetching all data sorted by title, date read or rating:
`await db.query("SELECT * FROM books ORDER BY title ASC");`

`await db.query("SELECT * FROM books ORDER BY date_read DESC");`

`await db.query("SELECT * FROM books ORDER BY rating DESC);`


Fetching specific data by id:
`await db.query("SELECT * FROM books WHERE id = $1", [id]);`

### Update

Update data with id:

```
await db.query(`
	UPDATE books
	SET title=$1, author=$2, isbn=$3, short_description=$4, notes=$5, rating=$6, date_read=$7
	WHERE id = $8;`,
	[title, author, isbn, short_description, notes, rating, new Date(date_read).toISOString().slice(0, 10), id]
);
```

### Delete

```
await db.query("DELETE FROM books WHERE id = $1", [id]);
```

## API - OpenLibrary Cover
See documentation [here](https://openlibrary.org/dev/docs/api/covers).

## Test plan
See test plan [here](docs/test_plan/test_plan.md).

## Further improvements
- Scalability: allow users to log in and manage their book lists. Allow sharing the list with other users.
- Tweaks: attach highlight to user account.