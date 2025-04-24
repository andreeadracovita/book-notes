# Test plan

## Test objective
- Testing PostgreSQL database CRUD
- Validating user workflows on desktop and mobile devices
- Validating user workflows on chrome, firefox, safari
- Validate functionality without connection to database with unpersisted data

## User workflows
- View the list of books
- Sort the list of books
	- Sort by newest added books (default)
	- Sort by title in ascending order
	- Sort by rating descending

- View details about a specific book

- Add a new book
	- Add book with incomplete fields and test restrictions
	- Add book with only required fields

- Edit details about a specific book
	- Remove required fileds and test restrictions
	- Add new notes for a specific book

- Delete a book from the list
