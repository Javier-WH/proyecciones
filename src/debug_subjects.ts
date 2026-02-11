console.log('Debugging Subjects:', subjects);
subjects?.forEach(s => {
    console.log(`Subject: ${s.subject}, isSemestral: ${s.isSemestral}, Quarter Keys:`, Object.keys(s.quarter));
});
