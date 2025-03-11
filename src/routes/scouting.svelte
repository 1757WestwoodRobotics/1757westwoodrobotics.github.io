<script>
	import Navbar from '../components/navbar.svelte';
	import Footer from '../components/footer.svelte';

  let selectedReef = 2;


  let autoReef = [Array(12).fill(false), Array(12).fill(false), Array(12).fill(false)]
  let teleopReef = [Array(12).fill(false), Array(12).fill(false), Array(12).fill(false)]

  let changeSelectedReef = (level) => {
    return () => {
      let old = selectedReef;
      selectedReef = level;
      for(let i=0; i<12;i++){
        document.getElementById("auto-"+(i+1)).checked = autoReef[selectedReef][i]
        document.getElementById("teleop-"+(i+1)).checked = autoReef[selectedReef][i]
      }
      let autoHold = document.getElementById("reef-auto-holder")
      autoHold.classList.toggle("bg-t-"+(old+2))
      autoHold.classList.toggle("bg-t-"+(level+2))

      let teleopHold = document.getElementById("reef-teleop-holder")
      teleopHold.classList.toggle("bg-t-"+(old+2))
      teleopHold.classList.toggle("bg-t-"+(level+2))

      document.getElementById("auto-sel-"+(old+2)).classList.toggle("inactive")
      document.getElementById("auto-sel-"+(old+2)).classList.toggle("active")
      document.getElementById("auto-sel-"+(level+2)).classList.toggle("inactive")
      document.getElementById("auto-sel-"+(level+2)).classList.toggle("active")

      document.getElementById("teleop-sel-"+(old+2)).classList.toggle("inactive")
      document.getElementById("teleop-sel-"+(old+2)).classList.toggle("active")
      document.getElementById("teleop-sel-"+(level+2)).classList.toggle("inactive")
      document.getElementById("teleop-sel-"+(level+2)).classList.toggle("active")
    }
  }

  let rotateReef = (angle) => {
    return () => {
    document.getElementById("auto-reef-input").style.transform = 'rotate('+angle+'deg)'
    document.getElementById("teleop-reef-input").style.transform = 'rotate('+angle+'deg)'
    }
  }

  let updateReefAuto = (number) => {
    return () => {
    autoReef[selectedReef][number-1] = !autoReef[selectedReef][number-1]
      let entryNumber = "entry.1165839798"
      let inner = ""
      for(let i=0; i<12;i++){
        if(autoReef[0][i]){
          inner += "<input type='hidden' name='"+entryNumber+"' value='"+String.fromCharCode(65+i)+"''/>"
        }
      }
      document.getElementById("autoL1").innerHTML = inner

      entryNumber = "entry.1533027981"
      inner = ""
      for(let i=0; i<12;i++){
        if(autoReef[1][i]){
          inner += "<input type='hidden' name='"+entryNumber+"' value='"+String.fromCharCode(65+i)+"''/>"
        }
      }
      document.getElementById("autoL2").innerHTML = inner

      entryNumber = "entry.302690072"
      inner = ""
      for(let i=0; i<12;i++){
        if(autoReef[2][i]){
          inner += "<input type='hidden' name='"+entryNumber+"' value='"+String.fromCharCode(65+i)+"''/>"
        }
      }
      document.getElementById("autoL3").innerHTML = inner
    }
  }
  let updateReefTeleop = (number) => {
    return () => {
    teleopReef[selectedReef][number-1] = !teleopReef[selectedReef][number-1]

      let entryNumber = "entry.359297210"
      let inner = ""
      for(let i=0; i<12;i++){
        if(teleopReef[0][i]){
          inner += "<input type='hidden' name='"+entryNumber+"' value='"+String.fromCharCode(65+i)+"''/>"
        }
      }
      document.getElementById("teleopL2").innerHTML = inner

      entryNumber = "entry.1548842258"
      inner = ""
      for(let i=0; i<12;i++){
        if(teleopReef[1][i]){
          inner += "<input type='hidden' name='"+entryNumber+"' value='"+String.fromCharCode(65+i)+"''/>"
        }
      }
      document.getElementById("teleopL3").innerHTML = inner

      entryNumber = "entry.773785512"
      inner = ""
      for(let i=0; i<12;i++){
        if(teleopReef[2][i]){
          inner += "<input type='hidden' name='"+entryNumber+"' value='"+String.fromCharCode(65+i)+"''/>"
        }
      }
      document.getElementById("teleopL4").innerHTML = inner
      console.log(teleopReef)
    }
  }

	let l1auto = 0;
	const increateL1auto = () => {
		l1auto++;
	};
	const decreaseL1auto = () => {
		l1auto--;
	};

	let droppedcoralauto = 0;

	const increasedroppedauto = () => {
		droppedcoralauto++;
	};
	const decreasedroppedauto = () => {
		droppedcoralauto--;
	};

	let autoAlgaeGrab = 0;

	const increaseAutoAlgaeGrab = () => {
		autoAlgaeGrab++;
	};
	const decreateAutoAlgaeGrab = () => {
		autoAlgaeGrab--;
	};

	let autoAlgaeBarge = 0;

	const increaseAutoAlgaeBarge = () => {
		autoAlgaeBarge++;
	};
	const decreaseAutoAlgaeBarge = () => {
		autoAlgaeBarge--;
	};

	let autoProcessor = 0;

	const increaseAutoProcessor = () => {
		autoProcessor++;
	};
	const decreaseAutoProcessor = () => {
		autoProcessor--;
	};

	let l1teleop = 0;

	const increaseL1Teleop = () => {
		l1teleop++;
	};
	const decreaseL1Teleop = () => {
		l1teleop--;
	};

	let teleopcoraldrop = 0;

	const increaseTDrop = () => {
		teleopcoraldrop++;
	};
	const decreaseTDrop = () => {
		teleopcoraldrop--;
	};

	let teleopAlgaeGrab = 0;

	const increaseteleopAlgaeGrab = () => {
		teleopAlgaeGrab++;
	};
	const decreaseTeleopAlgaeGrab = () => {
		teleopAlgaeGrab--;
	};

	let teleopBarge = 0;

	const increaseTeleopBarge = () => {
		teleopBarge++;
	};
	const decreaseTeleopBarge = () => {
		teleopBarge--;
	};

	let teleopProcessor = 0;

	const increaseTeleopProcessor = () => {
		teleopProcessor++;
	};
	const decreaseTeleopProcessor = () => {
		teleopProcessor--;
	};

	let miss = 0;

	const increaseMiss = () => {
		miss++;
	};
	const decreaseMiss = () => {
		miss--;
	};
</script>

<svelte:head>
	<title>Scouting Form</title>
	<meta name="description" content="Scouting submission for 1757" />
	<meta name="keywords" content="FRC, FIRST, Robotics" />
	<meta name="author" content="Westwood Robotics" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta property="og:title" content="Scouting submission for 1757" />
	<meta property="og:description" content="scouting data submission base for team 1757" />
<style>
  .active {
    background-color: #1a1aee;
  }
  .inactive {
    background-color: #2a2a3a;
  }
  .bg-t-2 {
    background-image: url("/img/scouting/2.png");
  }
  .bg-t-3 {
    background-image: url("/img/scouting/3.png");
  }
  .bg-t-4 {
    background-image: url("/img/scouting/4.png");
  }
</style>
</svelte:head>

<Navbar />

<div class="bg-zinc-800">
	<div class="container mx-auto p-4 max-w-prose text-white bg-zinc-900">
		<form
			class="w-full max-w-lg"
			action="https://docs.google.com/forms/u/0/d/e/1FAIpQLSfmPqseLSWrN8bCP5Op0Yi7rGYw0gT17kpEED8cQgUkUwja7A/formResponse"
			method="POST"
		>
			<h1><b>BASE INFO</b></h1>
			<div>
				<span>Your name: &nbsp;</span>
				<input type="input" name="entry.1381339308" class="bg-zinc-700" placeholder="ENTER NAME" />
			</div>
			<br />
			<div>
				<span>Team number being scouted: &nbsp;</span>
				<input type="number" name="entry.1172542334" class="bg-zinc-700" placeholder="254" />
			</div>
			<br />
			<div>
				<span>Match number: &nbsp;</span>
				<input type="number" name="entry.2123081628" class="bg-zinc-700" placeholder="00" />
			</div>

			<br />
			<hr />
			<br />


      <center>
        <div on:click={rotateReef(0)}   class="bg-zinc-500 p-2 rounded inline">Rotate Reef 0</div>
        <div on:click={rotateReef(90)}  class="bg-zinc-500 p-2 rounded inline">Rotate Reef 90</div>
        <div on:click={rotateReef(180)} class="bg-zinc-500 p-2 rounded inline">Rotate Reef 180</div>
        <div on:click={rotateReef(270)} class="bg-zinc-500 p-2 rounded inline">Rotate Reef 270</div>
      </center>

			<br />
			<hr />
			<br />
			<h1><b>AUTO</b></h1>
			<div class="grid grid-cols-4 gap-x-2 bg-zinc-800"> 

				<div class="bg-zinc-800 p-3 hover:font-bold">
					<input type="checkbox" name="entry.1459339326" value="auto leave" /> auto leave
				</div>
				<div class="bg-zinc-800 p-3 hover:font-bold col-span-2">
					<input type="checkbox" name="entry.1459339326" value="preloaded with coral" /> preloaded with coral
				</div>
				<div class="bg-zinc-800 p-3 hover:font-bold">
					<input type="checkbox" name="entry.1459339326" value="no show" /> no show
				</div>
				<div class="col-span-4 bg-repeat bg-t-4" style="background-size: 20%" id="reef-auto-holder">
          <div class="grid grid-cols-3 w-full">
            <span id="auto-sel-2" class="text-center inactive p-10" on:click={changeSelectedReef(0)}>L2</span>
            <span id="auto-sel-3" class="text-center inactive p-10" on:click={changeSelectedReef(1)}>L3</span>
            <span id="auto-sel-4" class="text-center active p-10" on:click={changeSelectedReef(2)}>L4</span>
          </div>
					<br />
          <center>
					<div
						class="flex flex-center justify-center items-center gap-4 gap-y-16 text-center bg-[url('/img/scouting/reef.png')] bg-center bg-cover h-96 aspect-square relative" id="auto-reef-input"
					>
          <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[45deg]"> <input class="scale-[2]" type="checkbox" on:click={updateReefAuto(1)} id="auto-1"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[75deg]"> <input class="scale-[2]" type="checkbox" on:click={updateReefAuto(2)} id="auto-2"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[105deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefAuto(3)} id="auto-3"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[135deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefAuto(4)} id="auto-4"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[165deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefAuto(5)} id="auto-5"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[195deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefAuto(6)} id="auto-6"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[225deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefAuto(7)} id="auto-7"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[255deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefAuto(8)} id="auto-8"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[285deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefAuto(9)} id="auto-9"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[315deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefAuto(10)} id="auto-10"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[345deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefAuto(11)} id="auto-11"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[375deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefAuto(12)} id="auto-12"/></span>
					</div>
          </center>
				</div>

        <span id="autoL1"></span>
        <span id="autoL2"></span>
        <span id="autoL3"></span>

				<div class="grid grid-cols-3 text-center w-full col-span-4">
					<div class="border-solid border-2 rounded border-zinc-500 m-3">
						<p class="p-3">L1</p>

						<div class="bg-zinc-800 mx-4">
							<p class="text-xl py-3 bg-blue-500" on:click={l1auto}>MORE</p>
							<input type="hidden" name="entry.802870340" value={l1auto} />
							<p>{l1auto}</p>
							<p class="text-xl py-3 bg-red-500" on:click={l1auto}>LESS</p>
						</div>
					</div>

					<div class="border-solid border-2 rounded border-zinc-500 m-3">
						<p class="p-3">Dropped coral</p>

						<div class="bg-zinc-800 mx-4">
							<p class="text-xl py-3 bg-blue-500" on:click={increasedroppedauto}>MORE</p>
							<input type="hidden" name="entry.1260908892" value={droppedcoralauto} />
							<p>{droppedcoralauto}</p>
              <p class="text-xl py-3 bg-red-500" on:click={decreasedroppedauto}>LESS</p>
						</div>
					</div>

					<div class="border-solid border-2 rounded border-zinc-500 m-3">
						<p class="p-3">Algae grabbed</p>

						<div class="bg-zinc-800 mx-4">
							<p class="text-xl py-3 bg-blue-500" on:click={increaseAutoAlgaeGrab}>MORE</p>
							<input type="hidden" name="entry.448746192" value={autoAlgaeGrab} />
							<p>{autoAlgaeGrab}</p>
							<p class="text-xl py-3 bg-red-500" on:click={decreateAutoAlgaeGrab}>LESS</p>
						</div>
					</div>

					<div class="border-solid border-2 rounded border-zinc-500 m-3">
						<p class="p-3">Algae barge</p>

						<div class="bg-zinc-800 mx-4">
							<p class="text-xl py-3 bg-blue-500" on:click={increaseAutoAlgaeBarge}>MORE</p>
							<input type="hidden" name="entry.839277872" value={autoAlgaeBarge} />
							<p>{autoAlgaeBarge}</p>
							<p class="text-xl py-3 bg-red-500" on:click={decreaseAutoAlgaeBarge}>LESS</p>
						</div>
					</div>
					<div class="border-solid border-2 rounded border-zinc-500 m-3">
						<p class="p-3">Algae processor</p>

						<div class="bg-zinc-800 mx-4">
							<p class="text-xl py-3 bg-blue-500" on:click={increaseAutoProcessor}>MORE</p>
							<input type="hidden" name="entry.630511118" value={autoProcessor} />
							<p>{autoProcessor}</p>
							<p class="text-xl py-3 bg-red-500" on:click={decreaseAutoProcessor}>LESS</p>
						</div>
					</div>
				</div>
			</div>

			<br />
			<hr />
			<br />


			<h1><b>TELEOP</b></h1>
			<div class="grid grid-cols-4 gap-x-2 bg-zinc-800"> 

				<div class="bg-zinc-800 p-3 hover:font-bold">
				</div>
				<div class="col-span-4 bg-repeat bg-t-4" style="background-size: 20%" id="reef-teleop-holder">
          <div class="grid grid-cols-3 w-full">
            <span id="teleop-sel-2" class="text-center inactive p-10" on:click={changeSelectedReef(0)}>L2</span>
            <span id="teleop-sel-3" class="text-center inactive p-10" on:click={changeSelectedReef(1)}>L3</span>
            <span id="teleop-sel-4" class="text-center active p-10" on:click={changeSelectedReef(2)}>L4</span>
          </div>
					<br />
          <center>
					<div
						class="flex flex-center justify-center items-center gap-4 gap-y-16 text-center bg-[url('/img/scouting/reef.png')] bg-center bg-cover h-96 aspect-square relative" id="teleop-reef-input"
					>
          <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[45deg]"> <input class="scale-[2]" type="checkbox" on:click={updateReefTeleop(1)} id="teleop-1"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[75deg]"> <input class="scale-[2]" type="checkbox" on:click={updateReefTeleop(2)} id="teleop-2"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[105deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefTeleop(3)} id="teleop-3"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[135deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefTeleop(4)} id="teleop-4"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[165deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefTeleop(5)} id="teleop-5"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[195deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefTeleop(6)} id="teleop-6"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[225deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefTeleop(7)} id="teleop-7"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[255deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefTeleop(8)} id="teleop-8"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[285deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefTeleop(9)} id="teleop-9"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[315deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefTeleop(10)} id="teleop-10"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[345deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefTeleop(11)} id="teleop-11"/></span>
            <span class="top-[6.3rem] left-[11.3rem] h-32 origin-bottom absolute rotate-[375deg]"><input class="scale-[2]" type="checkbox" on:click={updateReefTeleop(12)} id="teleop-12"/></span>
					</div>
          </center>
				</div>
        <span id="teleopL2"></span>
        <span id="teleopL3"></span>
        <span id="teleopL4"></span>

				<div class="grid grid-cols-3 text-center w-full col-span-4">
					<div class="border-solid border-2 rounded border-zinc-500 m-3">
						<p class="p-3">L1</p>

						<div class="bg-zinc-800 mx-4">
							<p class="text-xl py-3 bg-blue-500" on:click={increaseL1Teleop}>MORE</p>
							<input type="hidden" name="entry.1509540302" value={l1teleop} />
							<p>{l1teleop}</p>
							<p class="text-xl py-3 bg-red-500" on:click={decreaseL1Teleop}>LESS</p>
						</div>
					</div>

					<div class="border-solid border-2 rounded border-zinc-500 m-3">
						<p class="p-3">Dropped coral</p>

						<div class="bg-zinc-800 mx-4">
							<p class="text-xl py-3 bg-blue-500" on:click={increaseTDrop}>MORE</p>
							<input type="hidden" name="entry.2121724609" value={teleopcoraldrop} />
							<p>{teleopcoraldrop}</p>
							<p class="text-xl py-3 bg-red-500" on:click={decreaseTDrop}>LESS</p>
						</div>
					</div>

					<div class="border-solid border-2 rounded border-zinc-500 m-3">
						<p class="p-3">Algae grabbed</p>

						<div class="bg-zinc-800 mx-4">
							<p class="text-xl py-3 bg-blue-500" on:click={increaseteleopAlgaeGrab}>MORE</p>
							<input type="hidden" name="entry.328219189" value={teleopAlgaeGrab} />
							<p>{teleopAlgaeGrab}</p>
							<p class="text-xl py-3 bg-red-500" on:click={decreaseTeleopAlgaeGrab}>LESS</p>
						</div>
					</div>

					<div class="border-solid border-2 rounded border-zinc-500 m-3">
						<p class="p-3">Algae barge</p>

						<div class="bg-zinc-800 mx-4">
							<p class="text-xl py-3 bg-blue-500" on:click={increaseTeleopBarge}>MORE</p>
							<input type="hidden" name="entry.631533806" value={teleopBarge} />
							<p>{teleopBarge}</p>
							<p class="text-xl py-3 bg-red-500" on:click={decreaseTeleopBarge}>LESS</p>
						</div>
					</div>
					<div class="border-solid border-2 rounded border-zinc-500 m-3">
						<p class="p-3">Algae processor</p>

						<div class="bg-zinc-800 mx-4">
							<p class="text-xl py-3 bg-blue-500" on:click={increaseTeleopProcessor}>MORE</p>
							<input type="hidden" name="entry.839947357" value={teleopProcessor} />
							<p>{teleopProcessor}</p>
							<p class="text-xl py-3 bg-red-500" on:click={decreaseTeleopProcessor}>LESS</p>
						</div>
					</div>
				</div>
			</div>
			<br />
			<hr />
			<br />
			<h1><b>ENDING</b></h1>
			<div>
				<p>The robot was at the end</p>
				<select name="entry.193584090" class="bg-zinc-700">
					<option value="neither">Neither</option>
					<option value="parked">Parked</option>
					<option value="fshallow">Failed shallow</option>
					<option value="sshallow">Success shallow</option>
					<option value="fdeep">Failed deep</option>
					<option value="sdeep">Success deep</option>
				</select>
				<p>Role in the match</p>
				<select name="entry.1612925064" class="bg-zinc-700">
					<option value="offense">Offense</option>
					<option value="defense">Defense</option>
					<option value="feeder">Feeder</option>
					<option value="immobile">Immobile</option>
				</select>
				<br />
				<br />
				<p>How did the team handle gamepieces?</p>
				<div class="bg-zinc-800 p-3 hover:font-bold">
					<input type="checkbox" name="entry.218969793" value="coral floor" /> picked
					up coral from floor
				</div>
				<div class="bg-zinc-800 p-3 hover:font-bold">
					<input type="checkbox" name="entry.218969793" value="coral station" /> fed
					at coral station like a baby bird
				</div>
				<div class="bg-zinc-800 p-3 hover:font-bold">
					<input type="checkbox" name="entry.218969793" value="algae floor" /> picked up algae from ground
				</div>
				<div class="bg-zinc-800 p-3 hover:font-bold">
					<input type="checkbox" name="entry.218969793" value="algae reef" /> picked up algae from the reef
				</div>
				<div class="bg-zinc-800 p-3 hover:font-bold">
					<input type="checkbox" name="entry.218969793" value="algae knock" /> knocked algae
				</div>

				<p>During the match, the bot...</p>
				<div class="bg-zinc-800 p-3 hover:font-bold">
					<input type="checkbox" name="entry.1171427482" value="gamepiece stuck" /> gamepiece stuck
				</div>
				<div class="bg-zinc-800 p-3 hover:font-bold">
					<input type="checkbox" name="entry.1171427482" value="went under shallow cage" /> went under a shallow cage
				</div>
				<div class="bg-zinc-800 p-3 hover:font-bold">
					<input type="checkbox" name="entry.1171427482" value="broke or was disabled" /> robot
					broke or was disabled
				</div>

				<br />
				<h2><b class="text-large">MATCH NOTES</b></h2>
				<textarea
					rows="10"
					cols="30"
					name="entry.73579906"
					class="bg-zinc-700"
					placeholder="What happened? Auto fail? If the bot played defense how did it do? Was it under a lot of defense?"
				/>
			</div>
			<br />
			<hr />
			<br />
			<input type="submit" value="Submit" class="bg-zinc-300 text-black p-5" />
		</form>
	</div>
</div>

<Footer />
