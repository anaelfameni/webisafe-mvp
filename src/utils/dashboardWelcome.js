export function shouldShowDashboardWelcome(locationState) {
  return Boolean(locationState?.welcomeNewAccount);
}
