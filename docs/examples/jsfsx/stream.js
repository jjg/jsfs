x_out = "";
loop_count = 10;

i = setInterval(function(){
  if(loop_count > 0){
    x_out = x_out + "drip\n";
  } else {
    clearInterval(i);
  }
},1000)
