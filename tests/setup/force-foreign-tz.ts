// Run every unit test with a host time zone that is NOT Asia/Colombo.
// App time logic must never depend on the machine's zone (VPS, CI and laptops differ).
process.env.TZ = 'America/New_York';
