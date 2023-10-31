const Gyro = require('../ge-iru-gyro')

async function gyroStart() {

    const PORT = 4001;
    const HOST = '130.46.82.174'
    const gyro = new Gyro(HOST,PORT,{verbose:2})
   
    await gyro.connect();
    
    var cnt = 0
    var intvalID = setInterval( async ()=>{
        try {
    
            let rtn = await gyro.get_0F()
            console.log(rtn)
        
            rtn = await gyro.get_62()
            console.log(rtn)
                
        } catch (err) {
            console.error('There was an error:', err);
        }

        cnt++
        console.log('cnt =',cnt)
        if (cnt > 30) {
            console.log('clearing interval')
            clearInterval(intvalID)
            gyro.end();
        }

    },1000)
}


gyroStart()
console.log('done')








