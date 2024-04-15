x_out = "";
loop_count = 10;

for(var i=0;i<loop_count;i++){
  x_out = x_out + "drip\n";
  gong(x_out.length); 
  loop_count--;
}
