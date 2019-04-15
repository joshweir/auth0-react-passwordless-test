export const buildBaseAuth0User = (email) => ({
  email,
  email_verified: false,
	connection: "Username-Password-Authentication",
  verify_email: false,
  password: "S0me-password",
  user_id: email,
});
