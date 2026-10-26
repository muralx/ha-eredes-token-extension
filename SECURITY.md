# Security

Please report vulnerabilities privately through GitHub: **Security → Report a
vulnerability** on this repository. Do not open a public issue.

What the extension can access, by design:

- the cookies of `e-redes.pt` (to read the `aat` access token after you log in);
- the single Home Assistant address you enter in its options (Chrome asks you to
  allow it when you save);
- a Home Assistant long-lived access token you create for it, kept in the
  extension's local storage on your computer.

It sends the E-Redes token only to that Home Assistant address, nowhere else.
