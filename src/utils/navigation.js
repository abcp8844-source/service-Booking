export const handleSupport = () => {
  const myGmail = "abcp8844@gmail.com";
  const subject = "Help";
  const body = "I need help with the app.";
  
  window.location.href = `mailto:${myGmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export const handleShare = async () => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Service App',
        url: window.location.href,
      });
    } catch (err) {
      console.log('Share failed');
    }
  } else {
    alert('Link: ' + window.location.href);
  }
};
