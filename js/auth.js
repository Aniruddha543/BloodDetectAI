// auth.js
// requires supabase-client.js to be loaded first (which creates `supabase`)

async function signUpUser() {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  if (!email || !password) return alert('fill email & password');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return alert('Signup error: ' + error.message);
  alert('Signup initiated. Check your email for confirmation (if enabled). You can now login.');
}

async function loginUser() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  if (!email || !password) return alert('fill email & password');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert('Login failed: ' + error.message);
    return;
  }
  // redirect to dashboard
  window.location.href = 'dashboard.html';
}

async function signOut() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}
