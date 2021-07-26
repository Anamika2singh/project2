

function loginData(event){
axios
  .post('http://localhost:5000/auth/login', {
    email: event.target.elements.email.value,
    password: event.target.elements.password.value
  })
  .then(res => {
    console.log(res.data.data.token);
    if(res.data.status== 200)
    {
    localStorage.setItem("token", res.data.data.token);
    window.location.replace("http://localhost:5000/dashboard");
    }
    else console.log("Not 200");
  })
  .catch(error => {
    console.error("This is error",error);
  })
}