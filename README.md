# gi-iru-gyro
Communication driver for the GE 9181 Series Inertial Reference Gyro Unit or North Finding Unit. 

https://www.geaerospace.com/sites/default/files/2022-02/Avionics-Inertial-Reference-Unit-Brochure.pdf

The GE 9181 has a (0.11⁰ - 0.28⁰) north finding accuracy and takes about 3 minutes to resolve heading. 
There is also a Basse Motion Compensation (BMC) which can align with some small movement but takes a 
little longer to complete alignment (3 - 5 minutes). The GE 9181 is a spinning mass gyro. 

This driver is a port of the Perl module IRU_GE  

https://metacpan.org/pod/Device::IRU_GE
