const { exec } = require("child_process");
module.exports.startAllServer=(repo)=>{
    
    for(let item of repo){
      console.log(`${item.repoName} has started on port ${item.port}`)
      let st= exec('npm start', {cwd: item.path}, function(err, stdout, stderr) {
          
           if (err) {
            process.kill(process.pid)
            console.error('Error occurred in the child process:', err);
          }

          if (err) {
            console.error('Error occurred in the child process:', err);
          }

      });
      st.stdout.pipe(process.stdout)

    }
              
}