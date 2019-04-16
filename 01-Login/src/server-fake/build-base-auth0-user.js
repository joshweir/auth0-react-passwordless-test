export const buildBaseAuth0User = (email) => ({
  email,
  email_verified: false,
  connection: "email",
	verify_email: false,
});
