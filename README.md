# gi-iru-gyro
Communication driver for the GE 9181 Series Inertial Reference Gyro Unit or North Finding Unit. 

https://www.geaerospace.com/sites/default/files/2022-02/Avionics-Inertial-Reference-Unit-Brochure.pdf

The GE 9181 has a (0.11⁰ - 0.28⁰) north finding accuracy and takes about 3 minutes to resolve heading. 
There is also a Base Motion Compensation (BMC) alignment mode which can align with some small movement but takes a 
little longer to complete alignment (3 - 5 minutes). The GE 9181 is a spinning mass gyro. 

This driver is a port of the Perl module IRU_GE  

https://metacpan.org/pod/Device::IRU_GE

This driver communicates over a socket to a RS422/IP device such as a MOXA Nport device. The MOXA serial 
device is set into "server mode"

# Sample program 

Below is sample program with a setInterval loop of 3 seconds. Commands can be sent by writting them to a file
in the same directory. 

```
const Gyro = require('./ge-iru-gyro/ge-iru-gyro')

async function gyroStart() {

    const PORT = 4001;
    const HOST = '192.168.0.2'
    const gyro = new Gyro(HOST,PORT,{verbose:Verbose})
   
    await gyro.connect()

    var cnt = 0
    var intvalID = setInterval( async ()=>{
        try {

            // gyrocompass status
            const rtn0F = await gyro.get_0F()
            console.log(rtn0F)

            // IRU mode and BMC status 
            const rtn2C = await gyro.get_2C()
            console.log(rtn2C)

            // heading and attitude 
            rtn62 = await gyro.get_62()
            await dbc.set_rpy(rtn62)
            console.log(rtn62)

           const fs = require('fs');

           if (fs.existsSync('./gyro_cmd')) {
                let gyroCmdContent = fs.readFileSync('gyro_cmd', 'utf8').trim();

                if (gyroCmdContent === 'gyrocompass') {
                    gyro.set_5D(3);   // monitor with 0F
                    console.log("Sent gyrocompass command");
                } else if (gyroCmdContent === 'gyrocompassBMC') {
                    gyro.set_5D(9);   // monitor with 2C
                    console.log("Sent gyrocompass command");
                } else if (gyroCmdContent === 'reset') {
                    gyro.set_01();
                    console.log("Sent gyrocompass reset");
                }
                fs.unlinkSync('gyro_cmd');
           }

        } catch (err) {
            console.error('There was an error:', err);
        }
    },3000) // end setInterval
} // end function

gyroStart()
```
