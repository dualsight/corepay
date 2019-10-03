## Setup Bitcoin Core on AWS EC2

### Initial setup
 1. From the AWS console, navigate to `EC2`
 2. Click the Launch Instance button

#### Step 1: Choose an Amazon Machine Image (AMI)
 3. Click on the `AWS Marketplace` tab
 4. Search for `Debian Stretch` in the search box
 5. Find the AMI for `Debian GNU/Linux 9 (Stretch)` and click Select. A box will appear with details and a list of example prices. Click Continue.

#### Step 2: Choose an Instance Type. You will need an instance with at least 1GB RAM.
 6. Choose the `t3a.micro` instance, which has 1GB of memory and can be connected to EBS (Elastic Block Storage) of any size.
 7. Click Next: Configure Instance Details.

#### Step 3: Configure Instance Details
 > There’s probably nothing you need to change here. Click Next: Add Storage.

#### Step 4: Add Storage
> You'll have to find out the current size requirements for your desired setup. The good thing is that if you wish to expand EBS volumes in future, you can do it easily in real-time without taking your instance offline. I chose 40GB of storage for a pruned testnet node.
 8. Click Add New Volume.
 9. Choose `EBS`, `/dev/sdb` for the `Device` column, enter desired size in `Size`, and `General Purpose SSD` for the `Volume Type`.
 10. Uncheck the `Delete on Termination` checkbox for your volume. That way when you dispose of your instance the volume won't be shredded automatically.
 11. Click `Next: Add Tags`.

#### Step 5: Add Tags
> Adding a Name tag will make it easier to find your new instance, especially when you have more than one.
 12. Click Add Tag.
 13. Enter Name into the Key field and Bitcoin or something similar into the Value field.
 14. Click Next: Configure Security Group.

#### Step 6: Configure Security Group
 15. Select Create a new security group
 16. Enter `bitcoind` in the Security Group Name field.
 17. In the Description field enter something like, `Ports and services necessary for running a Bitcoin node.`
 > A rule allowing SSH access to your instance from any other IP address is already in place. The bitcoind client needs to talk through port 8333 for the Mainnet and 18333 for the Testnet. We’ll create rules allowing them both. We’ll also add another rule that opens the port used by the Lightning protocol.
 18. Click the `Add Rule` button.
 19. Select `Custom UDP` for the Type.
 20. Enter `8333` for Port Range.
 21. Select `Anywhere` for Source.
 22. Enter `mainnet` in the Description field.
 23. Perform the last five steps again, but use `18333` for the Port Range and `testnet` for the Description.
 24. Do it one more time, but use `9735` for the Port Range and `lightning` for the Description.
 25. Click Review and Launch.

#### Step 7: Review Instance Launch
> All the details of your instance are now presented for review. Assuming it all looks good, click Launch.

### Select Key Pair
One more step. Access to your AWS instance is controlled by a public/private key pair (not covered here.) I already had an AWS key pair set up, so I simply selected Choose an existing key pair, the pair I wanted to use, and selected the box acknowledging that access to the private key file will be required to access the instance, then clicked Launch Instance.

### Launching
> The next page keeps you informed on the launch status. Assuming all goes well, you will receive the message Your instances are now launching and instance ID like: `i-0d881a693cb29c072`.

Click `View Instances`. You should see your new Bitcoin instance in the list. Eventually the Instance State will change to Running. For awhile the Status Checks column will also say Initializing. Wait for this to change (reload the page if necessary) to 2/2 checks passed.

Log In to Your Instance for the First Time
From the View Instances page, click on your new instance in the table of instances. At the top you will find a Public IP field with an IP address like: xx.xx.xx.xx. This is an ephemeral IP address that will change if you stop and restart your instance. You can set up an EC2 Elastic IP address to keep this from happening (not covered here.)

I’m assuming you also have your .pem file with your private key.

In the terminal:

    $ ssh -i /path/to/your/keypair.pem admin@xx.xx.xx.xx

Since this is the first time you’re logging in to this IP address, you’ll be asked to verify the machine’s fingerprint. Go ahead and say yes.

After logging in successfully you’ll see the Linux prompt:

    $

### Installing Updates (optional)
The first thing to do is update everything that needs updating since this distro was produced:

    $ sudo apt-get update && apt-get upgrade

Stuff happens, you may be asked to confirm the download of updated packages. In some cases you may need to reboot your instance. Once you get back to the root prompt, set up future updates to happen automatically:

    $ sudo echo "unattended-upgrades unattended-upgrades/enable_auto_updates boolean true" | debconf-set-selections
    $ sudo apt-get -y install unattended-upgrades

### Set Up The External Volume
The instructions in this part are adapted from [Making an Amazon EBS Volume Available for Use on Linux](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-using-volumes.html) .

#### Find the name of the device
`lsblk` shows the block devices currently attached, along with any mounted volumes they contain.

    $ lsblk
    NAME        MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
    nvme1n1     259:0    0  300G  0 disk 
    nvme0n1     259:1    0    8G  0 disk 
     └─nvme0n1p1 259:2    0    8G  0 part /

In the output of `lsblk` above, the device and volume mounted at `/` is the boot volume— don’t touch this! The other one is the raw block (unformatted) volume EBS is providing.

    $ sudo file -s /dev/nvme1n1
    /dev/nvme1n1: data

The fact that this responds with data means that there is currently no filesystem on the volume— it needs to be formatted:

#### Format the device
    $ sudo mkfs -t ext4 /dev/nvme1n1
    mke2fs 1.43.4 (31-Jan-2017)
    ...
    Writing superblocks and filesystem accounting information: done

#### Make a directory for the volume mount point
    $ sudo mkdir /data

#### Mount the volume on the device at the mount point
    $ sudo mount /dev/nvme1n1 /data

#### Set permissions
Change the permissions of the data volume so it is accessible by the admin group.

    $ sudo chgrp admin /data
    $ sudo chmod g+w /data

#### Find the UUID of the external volume
    $ sudo file -s /dev/nvme1n1
    /dev/nvme1n1: Linux rev 1.0 ext4 filesystem data, UUID=6ba00350-4caa-41cf-bf9d-4924a74f1110 (needs journal recovery) (extents) (64bit) (large files) (huge files)

The command above shows that the UUID of `/dev/nvme0n1p1` is `6ba00350-4caa-41cf-bf9d-4924a74f1110`.

    $ sudo ls -al /dev/disk/by-uuid/
    total 0
    drwxr-xr-x 2 root root  80 Sep 10 06:40 .
    drwxr-xr-x 6 root root 120 Sep 10 03:21 ..
    lrwxrwxrwx 1 root root  13 Sep 10 06:40 6ba00350-4caa-41cf-bf9d-4924a74f1110 -> ../../nvme1n1
    lrwxrwxrwx 1 root root  15 Sep 10 03:21 b524f8c0-90e7-4fc7-a842-6cb2380086c8 -> ../../nvme0n1p1

The output of the command above agrees.

Make sure the volume is mounted at boot-time
Edit `/etc/fstab` to add a line for the file, including the UUID you identified above.

    UUID=6ba00350-4caa-41cf-bf9d-4924a74f1110       /data   ext4    defaults,nofail      0       2

#### Check for volume errors
    $ sudo mount -a

#### Reboot and make sure everything is correct
    $ sudo reboot

### Installation
> Latest version is obtainable from [https://bitcoin.org/bin/](https://bitcoin.org/bin/)

#### Setup helper vars
    $ export BITCOIN=bitcoin-core-0.18.0
    $ export BITCOINPLAIN=`echo  $BITCOIN | sed 's/bitcoin-core/bitcoin/'`

#### Download files
    $ wget https://bitcoin.org/bin/$BITCOIN/$BITCOINPLAIN-x86_64-linux-gnu.tar.gz
    $ wget https://bitcoin.org/bin/$BITCOIN/SHA256SUMS.asc
    $ wget https://bitcoin.org/laanwj-releases.asc

#### Verify Bitcoin Signature
    $ /usr/bin/gpg --import laanwj-releases.asc
    $ /usr/bin/gpg --verify SHA256SUMS.asc

> Amongst the info you get back from the last command should be a line telling you that you have a “Good signature”. (Don’t worry about the warning.)

#### Verify Bitcoin SHA
Next, you should verify the Hash for the Bitcoin tar file against the expected Hash:

    $ /usr/bin/sha256sum $BITCOINPLAIN-x86_64-linux-gnu.tar.gz | awk '{print $1}'
    $ cat SHA256SUMS.asc | grep $BITCOINPLAIN-x86_64-linux-gnu.tar.gz | awk '{print $1}'

> If those both produce the same number, it’s OK.

#### Install Bitcoin
    $ /bin/tar xzf $BITCOINPLAIN-x86_64-linux-gnu.tar.gz
    $ sudo /usr/bin/install -m 0755 -o root -g root -t /usr/local/bin $BITCOINPLAIN/bin/*
    $ /bin/rm -rf $BITCOINPLAIN/


#### Create a symlink for the bitcoin core directory
> This allows you to use the external volume for all your data.

    $ mkdir /data/bitcoin
    $ ln -s /data/bitcoin ~/.bitcoin

#### Create Bitcoin Configuration

Finally, you should set up a bitcoin configuration file: `~/.bitcoin/bitcoin.conf`. The following is a sample configuration which is appropriate for a pruned testnet setup:

    # Accept command line and JSON-RPC commands.
    server=1

    # Run in daemon mode
    daemon=1

    # Run on the test network instead of the real bitcoin network.
    testnet=1

    # Set database cache size in megabytes; machines sync faster with a larger cache.
    #  Recommend setting as high as possible based upon machine's available RAM.
    dbcache=500

    # Reduce storage requirements by only storing most recent N MiB of block.
    #  This mode is incompatible with -txindex and -rescan.
    #  WARNING: Reverting this setting requires re-downloading the entire blockchain.
    #  (default: 0 = disable pruning blocks, 1 = allow manual pruning via RPC,
    #   greater than 550 = automatically prune blocks to stay under target size in MiB).
    prune=10000

    # RPC credentials
    rpcuser=bitcoin
    rpcpassword=bitcoin

    [test]
    # Allow
    rpcallowip=127.0.0.1
    rpcbind=127.0.0.1

    # RPC port
    rpcport=8332

    [main]
    # Allow
    rpcallowip=127.0.0.1
    rpcbind=127.0.0.1

    # RPC port
    rpcport=8332

 
 #### Limit permissions to the configuration file
    /bin/chmod 600 .bitcoin/bitcoin.conf

#### Create Systemd service for Bitcoin Core
Create `/etc/systemd/system/bitcoind.service` with the following content:

    [Unit]
    Description=Bitcoin daemon
    After=network.target

    [Service]
    ExecStart=/usr/local/bin/bitcoind -daemon \
              -pid=/run/bitcoind/bitcoind.pid \
              -conf=/data/bitcoin/bitcoin.conf

    # Process management
    ####################
    Type=forking
    PIDFile=/run/bitcoind/bitcoind.pid
    Restart=on-failure

    # Directory creation and permissions
    ####################################

    # Run as
    User=admin
    Group=admin

    # /run/bitcoind
    RuntimeDirectory=bitcoind
    RuntimeDirectoryMode=0710

    # /etc/bitcoin
    ConfigurationDirectory=bitcoin
    ConfigurationDirectoryMode=0710

    # /var/lib/bitcoind
    StateDirectory=bitcoind
    StateDirectoryMode=0710

    # Hardening measures
    ####################

    # Provide a private /tmp and /var/tmp.
    PrivateTmp=true

    # Mount /usr, /boot/ and /etc read-only for the process.
    ProtectSystem=full

    # Disallow the process and all of its children to gain new privileges through execve().
    NoNewPrivileges=true

    # Use a new /dev namespace only populated with API pseudo devices such as /dev/null, /dev/zero and /dev/random.
    PrivateDevices=true

    # Deny the creation of writable and executable memory mappings.
    MemoryDenyWriteExecute=true

    [Install]
    WantedBy=multi-user.target

#### Enable Systemd service for Bitcoin Core
    $ sudo systemctl enable bitcoind

#### Start Bitcoin Core daemon
    $ sudo systemctl start bitcoind
