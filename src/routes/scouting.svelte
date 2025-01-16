<script>
	import Navbar from '../components/navbar.svelte';
	import Footer from '../components/footer.svelte';

	let ampAuto = 0;

	const increaseAmp = () => {ampAuto++}
	const decreaseAmp = () => {ampAuto--}

	let speakerAuto = 0;

	const increaseSpeaker = () => {speakerAuto++}
	const decreaseSpeaker = () => {speakerAuto--}

	let wingPickup = 0;

	const increaseWing = () => {wingPickup++}
	const decreaseWing = () => {wingPickup--}

	let centerPickup = 0;

	const increaseCenter = () => {centerPickup++}
	const decreaseCenter = () => {centerPickup--}

	let farPickup = 0;

	const increaseFar = () => {farPickup++}
	const decreaseFar = () => {farPickup--}


	let unampSpeaker = 0;

	const increaseUSpeaker = () => {unampSpeaker++}
	const decreaseUSpeaker = () => {unampSpeaker--}

	let ampSpeaker = 0;

	const increaseASpeaker = () => {ampSpeaker++}
	const decreaseASpeaker = () => {ampSpeaker--}

	let ampScore = 0;

	const increaseAmpTele = () => {ampScore++}
	const decreaseAmpTele = () => {ampScore--}

	let trapScore = 0;

	const increaseTrap = () => {trapScore++}
	const decreaseTrap = () => {trapScore--}

	let passed = 0;

	const increasePass = () => {passed++}
	const decreasePass = () => {passed--}

	let miss = 0;

	const increaseMiss = () => {miss++}
	const decreaseMiss = () => {miss--}
</script>

<svelte:head>
	<title>Scouting Form</title>
	<meta name="description" content="Scouting submission for 1757" />
	<meta name="keywords" content="FRC, FIRST, Robotics" />
	<meta name="author" content="Westwood Robotics" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta property="og:title" content="Scouting submission for 1757" />
	<meta property="og:description" content="scouting data submission base for team 1757" />
</svelte:head>

<Navbar />

<div class="bg-zinc-800">
	<div class="container mx-auto p-4 max-w-prose text-white bg-zinc-900">
		<form
			class="w-full max-w-lg"
			action="https://docs.google.com/forms/u/0/d/e/1FAIpQLSdVlOvy3z9hG4InW25KXDd8bn_f6y8ZBELNicA6Yu7gsJjUnA/formResponse"
			method="POST"
		>
		    <h1><b>BASE INFO</b></h1>
            <div>
                <span>Your name: &nbsp;</span>
                <input type="input" name="entry.1555041920" class="bg-zinc-700" placeholder="ENTER NAME"/>
            </div>
            <br>
            <div>
                <span>Team number being scouted: &nbsp;</span>
                <input type="number" name="entry.551058861" class="bg-zinc-700" placeholder="254"/>
            </div>
            <br>
            <div>
                <span>Match number: &nbsp;</span>
                <input type="number" name="entry.1707320079" class="bg-zinc-700" placeholder="00"/>
            </div>

            <br>
			<hr>
            <br>

		    <h1><b>AUTO</b></h1>
		    <div class="grid grid-cols-4 gap-x-2">
		        <div class="col-span-3">
			        <p>Attempted collection</p>
			        <br />
			        <div class="grid grid-cols-5 gap-4 gap-y-16 text-center bg-[url('/img/scouting/auto-collect-red.png')] bg-center bg-cover py-40">
				        <div class="bg-zinc-800 p-3 hover:font-bold"><input type="checkbox" name="entry.56360567" value="1"></div>
				        <div class="bg-zinc-800 p-3 hover:font-bold"><input type="checkbox" name="entry.56360567" value="2"></div>
				        <div class="col-span-3 grid grid-cols-3 gap-x-4">
				            <div class="bg-zinc-800 p-3 hover:font-bold"><input type="checkbox" name="entry.56360567" value="3"></div>
				        </div>
				        <div class="bg-zinc-800 p-3 hover:font-bold"><input type="checkbox" name="entry.56360567" value="4"></div>
				        <div class="bg-zinc-800 p-3 hover:font-bold"><input type="checkbox" name="entry.56360567" value="5"></div>
				        <div class="bg-zinc-800 p-3 hover:font-bold"><input type="checkbox" name="entry.56360567" value="6"></div>
				        <div class="bg-zinc-800 p-3 hover:font-bold"><input type="checkbox" name="entry.56360567" value="7"></div>
				        <div class="bg-zinc-800 p-3 hover:font-bold"><input type="checkbox" name="entry.56360567" value="8"></div>
			        </div>
			    </div>
			    <div class="grid grid-rows-2 text-center">
			        <div class="border-solid border-2 rounded border-zinc-500 my-3">
			            <p class="p-3">Amp</p>

			            <div class="bg-zinc-800 mx-4">
			                <p class="text-xl py-3 bg-blue-500" on:click={increaseAmp}>MORE</p>
			                <input type="hidden" name="entry.1926752669" value="{ampAuto}"/>
			                <p>{ampAuto}</p>
			                <p class="text-xl py-3 bg-red-500" on:click={decreaseAmp}>LESS</p>
			            </div>
			        </div>

			        <div class="border-solid border-2 rounded border-zinc-500 my-3">
			            <p class="p-3">Speaker</p>

			            <div class="bg-zinc-800 mx-4">
			                <p class="text-xl py-3 bg-blue-500" on:click={increaseSpeaker}>MORE</p>
			                <input type="hidden" name="entry.1553663479" value="{speakerAuto}"/>
			                <p>{speakerAuto}</p>
			                <p class="text-xl py-3 bg-red-500" on:click={decreaseSpeaker}>LESS</p>
			            </div>
			        </div>
			    </div>
			</div>

            <br>
			<hr>
            <br>

		    <h1><b>TELEOP</b></h1>
		    <div class="grid grid-cols-3 grid-rows-3 text-center">
			        <div class="border-solid border-2 rounded border-zinc-500 row-span-3 flex align-center items-center bg-zinc-800">
                  <div class="flex-1">
                      <p class="p-3">Pickup</p>

                      <div class="bg-zinc-800 mx-4">
                          <p class="text-xl py-3 bg-blue-500" on:click={increaseWing}>MORE</p>
                          <input type="hidden" name="entry.1373737509" value="{wingPickup}"/>
                          <p>{wingPickup}</p>
                          <p class="text-xl py-3 bg-red-500" on:click={decreaseWing}>LESS</p>
                      </div>
                  </div>
			        </div>
			        <div class="border-solid border-2 rounded border-zinc-500 my-3">
			            <p class="p-3">Unamped Speaker</p>

			            <div class="bg-zinc-800 mx-4">
			                <p class="text-xl py-3 bg-blue-500" on:click={increaseUSpeaker}>MORE</p>
			                <input type="hidden" name="entry.106049709" value="{unampSpeaker}"/>
			                <p>{unampSpeaker}</p>
			                <p class="text-xl py-3 bg-red-500" on:click={decreaseUSpeaker}>LESS</p>
			            </div>
			        </div>
			        <div class="border-solid border-2 rounded border-zinc-500 my-3">
			            <p class="p-3">Amplified Speaker</p>

			            <div class="bg-zinc-800 mx-4">
			                <p class="text-xl py-3 bg-blue-500" on:click={increaseASpeaker}>MORE</p>
			                <input type="hidden" name="entry.1330822060" value="{ampSpeaker}"/>
			                <p>{ampSpeaker}</p>
			                <p class="text-xl py-3 bg-red-500" on:click={decreaseASpeaker}>LESS</p>
			            </div>
			        </div>
			        <div class="border-solid border-2 rounded border-zinc-500 my-3">
			            <p class="p-3">Amp</p>

			            <div class="bg-zinc-800 mx-4">
			                <p class="text-xl py-3 bg-blue-500" on:click={increaseAmpTele}>MORE</p>
			                <input type="hidden" name="entry.424932978" value="{ampScore}"/>
			                <p>{ampScore}</p>
			                <p class="text-xl py-3 bg-red-500" on:click={decreaseAmpTele}>LESS</p>
			            </div>
			        </div>
			        <div class="border-solid border-2 rounded border-zinc-500 my-3">
			            <p class="p-3">Trap</p>

			            <div class="bg-zinc-800 mx-4">
			                <p class="text-xl py-3 bg-blue-500" on:click={increaseTrap}>MORE</p>
			                <input type="hidden" name="entry.1674092010" value="{trapScore}"/>
			                <p>{trapScore}</p>
			                <p class="text-xl py-3 bg-red-500" on:click={decreaseTrap}>LESS</p>
			            </div>
			        </div>
			        <div class="border-solid border-2 rounded border-zinc-500 my-3">
			            <p class="p-3">Passed</p>

			            <div class="bg-zinc-800 mx-4">
			                <p class="text-xl py-3 bg-blue-500" on:click={increasePass}>MORE</p>
			                <input type="hidden" name="entry.1615626336" value="{passed}"/>
			                <p>{passed}</p>
			                <p class="text-xl py-3 bg-red-500" on:click={decreasePass}>LESS</p>
			            </div>
			        </div>
			        <div class="border-solid border-2 rounded border-zinc-500 my-3">
			            <p class="p-3">Missed</p>

			            <div class="bg-zinc-800 mx-4">
			                <p class="text-xl py-3 bg-blue-500" on:click={increaseMiss}>MORE</p>
			                <input type="hidden" name="entry.856036666" value="{miss}"/>
			                <p>{miss}</p>
			                <p class="text-xl py-3 bg-red-500" on:click={decreaseMiss}>LESS</p>
			            </div>
			        </div>
		    </div>
            <br>
			<hr>
            <br>
		    <h1><b>ENDING</b></h1>
		    <div>
		        <p>The robot was at the end</p>
		        <select name="entry.1868673080" class="bg-zinc-700">
		            <option value="neither">Neither</option>
		            <option value="parked">Parked</option>
		            <option value="onstage">Onstage</option>
		        </select>
		        <p>Was the robot spotlit?</p>
		        <select name="entry.588469689" class="bg-zinc-700">
		            <option value="n">No</option>
		            <option value="y">Yes</option>
		        </select>
		        <p>Other bots in harmony:</p>
		        <select name="entry.1599211559" class="bg-zinc-700">
		            <option value="0">0</option>
		            <option value="1">1</option>
		            <option value="2">2</option>
		        </select>
		        <br>
		        <br>
		        <p>How did the team handle gamepieces?</p>
				<div class="bg-zinc-800 p-3 hover:font-bold"><input type="checkbox" name="entry.628497835" value="picked up notes from floor"> picked up notes from floor</div>
				<div class="bg-zinc-800 p-3 hover:font-bold"><input type="checkbox" name="entry.628497835" value="fed at source like a baby bird"> fed at source like a baby bird</div>
				<div class="bg-zinc-800 p-3 hover:font-bold"><input type="checkbox" name="entry.628497835" value="passed notes"> passed notes</div>
				<div class="bg-zinc-800 p-3 hover:font-bold"><input type="checkbox" name="entry.628497835" value="stashed notes"> stashed notes</div>

				<p>During the match, the bot...</p>
				<div class="bg-zinc-800 p-3 hover:font-bold"><input type="checkbox" name="entry.1016412079" value="played defense"> played defense</div>
				<div class="bg-zinc-800 p-3 hover:font-bold"><input type="checkbox" name="entry.1016412079" value="note stuck"> note stuck</div>
				<div class="bg-zinc-800 p-3 hover:font-bold"><input type="checkbox" name="entry.1016412079" value="robot broke or was disabled"> robot broke or was disabled</div>

<br>
                <h2><b class="text-large">MATCH NOTES</b></h2>
                <textarea rows="10" cols="30" name="entry.1891310676" class="bg-zinc-700" placeholder="What happened? Auto fail? If the bot played defense how did it do? Was it under a lot of defense?"></textarea>
		    </div>
            <br>
			<hr>
            <br>
              <input type="submit" value="Submit" class="bg-zinc-300 text-black p-5">
		</form>
	</div>
</div>

<Footer />
