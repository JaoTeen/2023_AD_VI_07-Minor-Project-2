const utils={};

utils.flaggedUsers=
   [1663882102141,1663900040545,1664485938220];

utils.styles={
   car:{color:'gray',text:'🚗'},
   fish:{color:'red',text:'🐠'},
   house:{color:'yellow',text:'🏠'},
   tree:{color:'green',text:'🌳'},
   bicycle:{color:'cyan',text:'🚲'},
   guitar:{color:'blue',text:'🎸'},
   pencil:{color:'magenta',text:'✏️'},
   clock:{color:'lightgray',text:'🕒'},
};
utils.styles["?"]={color:'red',text:'❓'};

utils.formatPercent=(n)=>{
   return (n*100).toFixed(2)+"%";
}

utils.printProgress=(count,max)=>{
   process.stdout.clearLine();
   process.stdout.cursorTo(0);
   const percent=utils.formatPercent(
      count/max
   );
   process.stdout.write(count+"/"+max+
      " ("+percent+")"
   );
}

utils.groupBy=(objArray,key)=>{
   const groups={};
   for(let obj of objArray){
      const val=obj[key];
      if(groups[val]==null){
         groups[val]=[];
      }
      groups[val].push(obj);
   }
   return groups;
}

utils.distance=(p1,p2)=>{
   return Math.sqrt(
      (p1[0]-p2[0])**2+
      (p1[1]-p2[1])**2
   );
}

utils.getNearest=(loc,points,k=1)=>{
   const obj=points.map((val,ind)=>{
      return {ind,val}
   });
   const sorted=obj.sort((a,b)=>{
      return utils.distance(loc,a.val)-
         utils.distance(loc,b.val)
   });
   const indices=sorted.map((obj)=>obj.ind);
   return indices.slice(0,k);
}

utils.invLerp=(a,b,v)=>{
   return (v-a)/(b-a);
}

utils.normalizePoints=(points,minMax)=>{
   let min,max;
   const dimensions=points[0].length;
   if(minMax){
      min=minMax.min;
      max=minMax.max;
   }else{
      min=[...points[0]];
      max=[...points[0]];
      for(let i=1;i<points.length;i++){
         for(let j=0;j<dimensions;j++){
            min[j]=Math.min(min[j],points[i][j]);
            max[j]=Math.max(max[j],points[i][j]);
         }
      }
   }
   for(let i=0;i<points.length;i++){
      for(let j=0;j<dimensions;j++){
         points[i][j]=
            utils.invLerp(min[j],max[j],points[i][j]);
      }
   }
   return {min,max};
}

utils.toCSV=(Headers,samples)=>{
   let str=Headers.join(",")+"\n";
   for(const sample of samples){
      str+=sample.join(",")+"\n";
   }
   return str;
}

if(typeof module!=='undefined'){
   module.exports=utils;
}