const net = require('net');
const { PromiseSocket } = require('promise-socket');

class GeIruGyro {

    // Used in several of the responses
    iruModeLst = ['None','Power Up Mode','Standby Mode','Gyrocompass Mode (GC)',
    'Gyrocompass Abort Mode','Initiated BIT Mode','Navigation Mode (NAV)',  
    'Reserved','In-Vehicle Calibration Mode','Base Motion Compensated Coarse Align',
    'Base Motion Compensated Fine Align', 'Base Motion Compensated Align Abort']

    constructor(host, port, options={}) {
        this.host = host
        this.port = port
        this.socket = new PromiseSocket(new net.Socket())
        this.verbose = options.verbose || 0
    }

    async connect() {
        try {
            await this.socket.connect(this.port, this.host);
            console.log(`Connected to ${this.host}:${this.port}`);
        } catch (err) {
            console.error(`Connection error: ${this.host}:${this.port}`, err);
            throw err; 
        }
    }

    async write(message) {
        try {
          const num = await this.socket.write(message)
          if (this.verbose > 1) console.log('Sent:', message)
          return num
        } catch (err) {
          console.error('Error sending data:', err);
          throw err; 
        }
    }

    async read() {
        try {
            const response = await this.socket.read();
            if (this.verbose > 1) console.log('Rcvd:', response);
            return response
        } catch (err) {
            console.error('Error reading data:', err);
            throw err; 
        }
    }

    // -------------------------------------------------
    async transact(cmdList,sndOnly=0) {
    
      cmdList[0] = parseInt(cmdList[0], 16); // Command header is given in hex
    
      let wordCmd = Buffer.alloc(0);
      let checksum = 0;
    
      for (const cmd of cmdList) {
        const bn = Buffer.alloc(2);
        bn.writeUInt16BE(cmd);
        wordCmd = Buffer.concat([wordCmd, bn]);
        checksum ^= bn.readUInt16BE();
      }
    
      const checksumBuffer = Buffer.alloc(2);
      checksumBuffer.writeUInt16BE(checksum);
      wordCmd = Buffer.concat([wordCmd, checksumBuffer]);
    
      const cntOut = await this.write(wordCmd);
      if (cntOut === 0) {
        console.warn('write failed');
      }
    
      const cmdLen = wordCmd.length;
      if (cntOut !== cmdLen) {
        throw new Error(`write incomplete, only wrote ${cntOut}, should have written ${cmdLen}`);
      }

      // set commands have nothing to read
      if (sndOnly) return 1
      
      // ------- read ------- 
      let rtnBuf = Buffer.alloc(16);
      rtnBuf = await this.read();
     
      const cmdRtn = rtnBuf.readUInt16LE(0);
    
      if (cmdRtn !== cmdList[0]) {
        console.warn(`Return header does not match command sent for ${cmdList[0]} != ${cmdRtn}: ${rtnBuf.toString('hex')}`);
      }
    
      // -------- Calculate checksum ----------
      // --- Probably a more efficient of doing this... But it works!
      const wrdList = rtnBuf.toString('hex').match(/.{4}/g);
      const cksumRtn = Buffer.from(wrdList.pop(), 'hex');
      const cksumRtnS = cksumRtn.readUInt16BE();
    
      let cksumClc = 0;
      for (const word of wrdList) {
        cksumClc ^= parseInt(word, 16);
      }
    
      const cksumClcS = cksumClc
    
      if (cksumClcS !== cksumRtnS) {
        console.warn(`CHCKSUM FAILED (calc=rtn) ${cksumClcS} != ${cksumRtnS}`);
      }
    
      let payloadBuf = rtnBuf.subarray(2)

      return payloadBuf;
    }

    async end() {
        try {
            await this.socket.end();
            console.log('Connection ended.');
        } catch (err) {
            console.error('Error ending connection:', err);
            throw err; 
        }
    }

    // Conversion Utility Functions 
    // -----------------------------------------------------
    // const longList = convLong([/* some byte values */]);
    // const shortList = convShort([/* some byte values */]);
    // const hexList = convHex([/* some byte values */]);
    convLong(b_lst) {
        const l_lst = [];
      
        for (let i = 0; i < b_lst.length; i += 4) {
          // Node.js Buffer does not support unpacking data in "big-endian" byte order by default,
          // so we have to handle the conversion ourselves.
          const buf = Buffer.from([b_lst[i+2], b_lst[i+3], b_lst[i], b_lst[i+1]]);
          l_lst.push(buf.readInt32LE(0)); // readInt32LE for 32-bit integer
        }
      
        return l_lst;
      }
    
    // ----------------------------------
    convShort(b_lst) {
      const s_lst = [];
     
      for (let i = 0; i < b_lst.length; i += 2) {
        s_lst.push(b_lst.readInt16LE(i))
      }

      return s_lst;
    }
    
    // ----------------------------------
    convHex(b_lst) {
      const h_lst = [];
    
      for (let i = 0; i < b_lst.length; i++) {
        const buf = Buffer.from([b_lst[i]]);
        h_lst.push(buf.toString('hex')); // converting byte to its hexadecimal representation
      }
    
      return h_lst;
    }
    
    /* ---------------------------------
     * Set mode for gyrocompass or other modes
     * @param {string|number} mode
     * @returns {Array} lst
     */
    async set_5D(mode) {
 
      // Using a regular expression to validate the mode.
      const validModes = /^(3|6|8|9|12)$/
      if (!validModes.test(mode)) {
        throw new Error('Wrong mode sent to 5D command')
      }

      this.transact(['0x005D', mode, '0', '0', '0', '0', '0'],true)
      return 1
    }


    // ----------------------------------
    async get_0F() {
      let rtnBuf = await this.transact(['0x000F', '0', '0', '0', '0', '0' ,'0'])
    
      let len = rtnBuf.length
      if (len < 1) {
        console.warn("Status not returned")
        return '' // raise error?
      }
    
      rtnBuf = this.convShort(rtnBuf) 
    
      const gcModeLst = [
        'CHECK_IF_VALID_TO_GC', 'FIRST_SETTLE_AT_0', 'FIRST_COLLECT_DATA_AT_0',
        'MOVE_0_TO_180', 'STOP_AT_180', 'SETTLE_AT_180', 'FIRST_COLLECT_DATA_AT_180',
        'SECOND_COLLECT_DATA_AT_180', 'MOVE_FROM_180_TO_0', 'STOP_AT_0',
        'SETTLE_AT_0', 'SECOND_COLLECT_DATA_AT_0', 'COMPUTE_FIRST_HEADING_EST',
        'GYRO_COMPASS_FAIL', 'END_GYRO_COMPASS', 'RETRY_MOVE_0_TO_180',
        'RETRY_MOVE_180_TO_0', 'MOVE_TO_0_NOW', 'RESTART_GYRO_COMPASS',
        'ESTIMATE_R_GYRO_BIAS', 'ITERATE_HEADING_ESTIMATE'
      ]
    
      let hsh = {}
      hsh['gc_time'] = Math.round(rtnBuf[3] / 61).toString()
      hsh['gc_mode_num'] = rtnBuf[2]
      hsh['gc_mode_str'] = gcModeLst[rtnBuf[2]]
      hsh['box_az_align'] = rtnBuf[0]
      hsh['residual'] = rtnBuf[1]
      hsh['move_stat'] = rtnBuf[4]
      hsh['move_stat_str'] = rtnBuf[4] ? "Moving" : "Not Moving"
      hsh['len'] = len
    
      return hsh
    }

  /**
    * Heading and Attitude
    * @returns {Object} hsh
  */
  async get_62() {
    
    let rtnBuf = await this.transact(['0x062', '0', '0', '0', '0', '0' ,'0']);

    // Message format from the IRU:
    // Word 0: Grid Heading 
    // Word 1: True Heading 
    // Word 2: Pitch
    // Word 3: Roll
    let sLst = this.convShort(rtnBuf)

    let hsh = {
        hdg_grid: sLst[0] / 100,
        hdg_true: sLst[1] / 100,
        pitch: sLst[2] / 100,
        roll: sLst[3] / 100
    };

    return hsh
  }  

    // ----------------------------------
    async get_2C() {
      let rtnBuf = await this.transact(['0x002C', '0', '0', '0', '0', '0' ,'0'])
  
      let len = rtnBuf.length
      if (len < 1) {
        throw new Error("02C Status not returned")
      }
  
      rtnBuf = this.convShort(rtnBuf) 
  
      const gcBmcState = ['CHECK_IF_VALID_TO_GC','SETTLE_AT_0','FIRST_COLLECT_DATA_AT_0',
        'MOVE_0_TO_180','STOP_AT_180','COLLECT_DATA_AT_180','MOVE_FROM_180_TO_0',
        'STOP_AT_0','SECOND_COLLECT_DATA_AT_0','END_GYRO_COMPASS','MOVE_TO_0_NOW',
        'RESTART_GYRO_COMPASS']  
  
      const stat = parseInt(rtnBuf[5])  
   
      const statLeast = stat & 0x00FF
      const statMost  = stat>>8 & 0xF   // Only the first 4 bits (section 3.2.3)
  
      let hsh = {
        hdg_true: rtnBuf[0] / 100,
        hdg_grid: rtnBuf[1] / 100,
        gc_bmc_mode_num : rtnBuf[2],
        gc_bmc_mode_str : gcBmcState[rtnBuf[2]],
        gc_bmc_time: Math.round(rtnBuf[3] / 61).toString(),
        hdg_bmc_var: rtnBuf[4] / 100,
        cbit: statLeast,
        iru_mode: statMost,
        iru_mode_str:this.iruModeLst[statMost]
      }
      return hsh
    }
}

module.exports = GeIruGyro;
  