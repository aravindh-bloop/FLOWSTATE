async function main() {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('RESEND_API_KEY not set');
    return;
  }

  const to = 'prajeinck@gmail.com'; 
  console.log('Testing Resend with key:', resendKey.substring(0, 5) + '...');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'FlowState <onboarding@resend.dev>',
      to,
      subject: 'Resend Test',
      html: '<strong>Resend is working</strong>',
    }),
  });

  const data = await res.json();
  console.log('Response:', res.status, data);
}

main().catch(console.error).finally(() => process.exit());
