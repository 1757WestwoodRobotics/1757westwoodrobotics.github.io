<script>
	import Navbar from '../../components/navbar.svelte';
	import Footer from '../../components/footer.svelte';
	import { onMount } from 'svelte';

	// Counters
	let autoFuel = 0;
	let teleopFuel = 0;
	let teleopFuelFed = 0;

	// Skills (Ranges)
	let scoringEff = 3;
	let feedingSkill = 3;
	let defSkill = 0;

	// Match Timer & Timeline
	let matchStarted = false;
	let matchTime = 0;
	let timerInterval;
	let timeline = [];
	let activeActions = new Set();

	const TBA_KEY = import.meta.env.VITE_TBA_KEY;

	const toggleTimer = () => {
		if (matchStarted) {
			clearInterval(timerInterval);
			matchStarted = false;
		} else {
			matchStarted = true;
			const startTime = Date.now() - matchTime * 1000;
			timerInterval = setInterval(() => {
				matchTime = Math.floor((Date.now() - startTime) / 1000);
			}, 1000);
		}
	};

	const resetMatch = () => {
		if (confirm('Reset match data and timer?')) {
			clearInterval(timerInterval);
			matchStarted = false;
			matchTime = 0;
			timeline = [];
			activeActions.clear();
			activeActions = activeActions;
			autoFuel = 0;
			teleopFuel = 0;
			teleopFuelFed = 0;
      document.getElementById('scoutingForm').reset();
		}
	};

	const recordPointAction = (code) => {
		if (!matchStarted) toggleTimer();
		timeline = [...timeline, { code, time: matchTime, type: 'point' }];
	};

	const startAction = (code) => {
		if (!matchStarted) toggleTimer();
		if (!activeActions.has(code)) {
			activeActions.add(code);
			activeActions = activeActions;
			timeline = [...timeline, { code, time: matchTime, type: 'start' }];
		}
	};

	const stopAction = (code) => {
		if (activeActions.has(code)) {
			activeActions.delete(code);
			activeActions = activeActions;
			timeline = [...timeline, { code, time: matchTime, type: 'stop' }];
		}
	};

	// Serialization for form submission
	$: serializedTimeline = timeline.map(e => `${e.code}:${e.type}@${e.time}`).join(';');

	// Counter functions with timeline integration
	const changeAutoFuel = (val) => {
		if (val > 0) recordPointAction('auto_fuel');
		autoFuel = Math.max(0, autoFuel + val);
	};
	const changeTeleopFuel = (val) => {
		if (val > 0) recordPointAction('tele_fuel');
		teleopFuel = Math.max(0, teleopFuel + val);
	};
	const changeTeleopFuelFed = (val) => {
		if (val > 0) recordPointAction('tele_fed');
		teleopFuelFed = Math.max(0, teleopFuelFed + val);
	};

	const parseCSV = (csvText) => {
	  const lines = csvText.trim().split('\n');
	  const headers = lines[0].split(',');
	  const result = [];

	  for (let i = 1; i < lines.length; i++) {
	    const obj = {};
	    const currentline = lines[i].split(',');

	    for (let j = 0; j < headers.length; j++) {
	      obj[headers[j].trim()] = currentline[j].trim();
	    }
	    result.push(obj);
	  }
	  return result;
	}
	let selectedMatchData = null;
	let selectedTeam = 0;
	let matchTeams = [];

	// Fetch match data from TBA API
	const getMatchData = async () => {
		selectedMatchData = null;
		matchTeams = [];
		
		try {
			const matchNumInput = document.querySelector('input[name="entry.528540297"]');
			if (!matchNumInput || !matchNumInput.value) return;
			
			const matchNum = matchNumInput.value;
			const EVENT_KEY_LOCAL = import.meta.env.VITE_EVENT_KEY || '2026rikin';
			const matchKey = `${EVENT_KEY_LOCAL}_qm${matchNum}`;
			
			// Fetch match data from TBA
			const matchRes = await fetch(
				`https://www.thebluealliance.com/api/v3/match/${matchKey}`,
				{ headers: { 'X-TBA-Auth-Key': TBA_KEY } }
			);
			
			if (!matchRes.ok) {
				console.error('Match not found in TBA');
				return;
			}
			
			const matchData = await matchRes.json();
			// Extract team keys and convert to numbers
			const redTeams = matchData.alliances.red.team_keys.map(key => key.replace('frc', ''));
			const blueTeams = matchData.alliances.blue.team_keys.map(key => key.replace('frc', ''));
			matchTeams = [...redTeams, ...blueTeams];
			
			// Fetch match predictions from Statbotics (single call, not per-team)
			let matchPrediction = null;
			try {
				const statRes = await fetch(
					`https://api.statbotics.io/v3/match/${EVENT_KEY_LOCAL}_qm${matchNum}`
				);
				if (statRes.ok) {
					matchPrediction = await statRes.json();
				}
			} catch (e) {
				console.error('Error fetching statbotics match prediction:', e);
			}
			
			// Calculate alliance predictions from match data
			let redScore = matchPrediction?.pred?.red_score || 0;
			let blueScore = matchPrediction?.pred?.blue_score || 0;
			
			// Fallback calculation if direct scores aren't available
			if (redScore === 0 && blueScore === 0 && matchPrediction) {
				redScore = matchPrediction.red_rp_1 + matchPrediction.red_rp_2 || 0;
				blueScore = matchPrediction.blue_rp_1 + matchPrediction.blue_rp_2 || 0;
			}
			
			const redWinPct = redScore > 0 || blueScore > 0 
				? Math.round((redScore / (redScore + blueScore)) * 100)
				: 50;
			const blueWinPct = 100 - redWinPct;
			
			// Build match data object compatible with template
			selectedMatchData = {
				'Match': `Qual ${matchNum}`,
				'R1': redTeams[0] || '',
				'R2': redTeams[1] || '',
				'R3': redTeams[2] || '',
				'B1': blueTeams[0] || '',
				'B2': blueTeams[1] || '',
				'B3': blueTeams[2] || '',
				'Red win %': `${redWinPct}%`,
				'Blue win %': `${blueWinPct}%`,
				// Estimate points (rough calculation)
				'Points if guessed blue correctly': Math.round(redWinPct) || 25,
				'Points if guessed red correctly': Math.round(blueWinPct) || 25,
				'Points if incorrectly guessed': Math.min(redWinPct / 2, blueWinPct / 2)
			};
			
			console.log('Match data:', selectedMatchData);
		} catch (e) {
			console.error('Error fetching match data:', e);
		}
	};
</script>

<svelte:head>
	<title>Scouting Form - REBUILT 2026</title>
	<meta name="description" content="Scouting submission for 1757 - REBUILT 2026" />
</svelte:head>

<Navbar />

<div class="bg-zinc-800">
	<div class="container mx-auto p-4 max-w-prose text-white bg-zinc-900 min-h-screen">
		<!-- Match Controller Sticky Header -->
		<div class="sticky top-0 z-50 bg-zinc-900 border-b border-zinc-700 p-4 mb-6 shadow-xl -mx-4">
			<div class="flex items-center justify-between gap-4">
				<div class="flex flex-col">
					<span class="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Match Timer</span>
					<span class="text-4xl font-mono font-black {matchStarted ? 'text-green-500' : 'text-zinc-400'}">
						{Math.floor(matchTime / 60)}:{String(matchTime % 60).padStart(2, '0')}
					</span>
				</div>
				<div class="flex gap-2">
					<button type="button" on:click={toggleTimer} class="px-6 py-2 rounded-lg font-bold transition {matchStarted ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}">
						{matchStarted ? 'STOP' : 'START'}
					</button>
					<button type="button" on:click={resetMatch} class="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-bold text-xs">
						RESET
					</button>
					<a href="/scouting-dashboard" class="px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg font-bold text-xs flex items-center">
						DASHBOARD
					</a>
					<a href="/scouting-assignments" class="px-4 py-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg font-bold text-xs flex items-center">
						ASSIGNMENTS
					</a>
				</div>
			</div>
			{#if timeline.length > 0}
				<div class="mt-2 text-[10px] text-zinc-500 truncate font-mono">
					Last: {timeline[timeline.length-1].code} @ {timeline[timeline.length-1].time}s
				</div>
			{/if}
		</div>

		<form
			class="w-full"
			action="https://docs.google.com/forms/u/0/d/e/1FAIpQLScTQ5gSQ9cnMgUszwJ2k651a1uiHPpv1g6uj_C7A1XAHUHb5Q/formResponse"
			method="POST"
      id="scoutingForm"
		>
			<input type="hidden" name="entry.2000596765" value={serializedTimeline} />

			<!-- PREMATCH -->
			<div class="mb-8">
				<h2 class="text-xl font-bold border-b border-zinc-700 pb-2 mb-4 text-blue-400">PRE-MATCH</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
					<div class="flex flex-col">
						<label class="text-xs font-semibold uppercase text-zinc-400 mb-1">Scouter Initials</label>
						<input type="text" name="entry.55361842" class="bg-zinc-800 border border-zinc-700 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ABC" required />
					</div>
					<div class="flex flex-col">
						<label class="text-xs font-semibold uppercase text-zinc-400 mb-1">Match Number</label>
            <input type="number" name="entry.528540297" class="bg-zinc-800 border border-zinc-700 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="1" required on:input={getMatchData}/>
					</div>
					<div class="flex flex-col">
						<label class="text-xs font-semibold uppercase text-zinc-400 mb-1">Team Number</label>
            <input type="number" name="entry.1130076361" class="bg-zinc-800 border border-zinc-700 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="1757" required bind:value={selectedTeam}/>
            {#if selectedMatchData && [selectedMatchData["R1"], selectedMatchData["R2"], selectedMatchData["R3"], selectedMatchData["B1"], selectedMatchData["B2"], selectedMatchData["B3"]].includes(selectedTeam !== null ? selectedTeam.toString() : "null")}
              <p class="text-xs text-green-400 mt-1">Team is in this match!</p>
              <p class="text-xs text-zinc-500 mt-1">You are scouting the {["R1", "R2", "R3"].find(pos => selectedMatchData[pos] == selectedTeam !== null ? selectedTeam.toString() : "null") ? 'Red' : 'Blue'} Alliance</p>
            {:else if selectedMatchData}
              <p class="text-xs text-red-400 mt-1">Team is NOT in this match.</p>
              <p>Valid teams are: {[selectedMatchData["R1"], selectedMatchData["R2"], selectedMatchData["R3"], selectedMatchData["B1"], selectedMatchData["B2"], selectedMatchData["B3"]].join(', ')}</p>
            {/if}
					</div>
					<div class="flex flex-col">
						<label class="text-xs font-semibold uppercase text-zinc-400 mb-1">Starting Position</label>
						<select name="entry.236449401" class="bg-zinc-800 border border-zinc-700 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none">
							<option value="OT">Outpost Trench</option>
							<option value="OBFT">Outpost Bump Favoring Trench</option>
							<option value="OBFH">Outpost Bump Favoring Hub</option>
							<option value="H">Hub</option>
							<option value="DBFH">Depot Bump Favoring Hub</option>
							<option value="DBFT">Depot Bump Favoring Trench</option>
							<option value="DT">Depot Trench</option>
							<option value="NS">No position / no show</option>
						</select>
					</div>
				</div>
				<label class="flex items-center space-x-3 bg-zinc-800 p-3 rounded border border-zinc-700 cursor-pointer hover:bg-zinc-700 transition">
					<input type="checkbox" name="entry.65205079" value="no show" class="w-5 h-5 rounded" />
					<span class="font-medium">No Show</span>
				</label>
        {#if selectedMatchData}
        <div class="mt-4 p-3 bg-zinc-700 rounded text-sm text-zinc-300">
          <p><strong>GambleScout:</strong> You can only <span class="font-semibold uppercase">win</span> points for GambleScout. Please predict the team you are going to win, the current odds for this match are:</p>
          <p class="uppercase font-semibold bg-zinc-800 p-2">Blue {selectedMatchData["Blue win %"]} | Red {selectedMatchData["Red win %"]} </p>
          Your point potential is:
          <div class="grid grid-cols-3 bg-zinc-700 p-2 rounded mt-2 text-center font-mono text-xs">
            <label></label>
            <label>Bet on Blue</label>
            <label>Bet on Red</label>
            <label>Blue Wins</label>
            <label>{selectedMatchData["Points if guessed blue correctly"]}</label>
            <label>{selectedMatchData["Points if incorrectly guessed"]}</label>
            <label>Red Wins</label>
            <label>{selectedMatchData["Points if incorrectly guessed"]}</label>
            <label>{selectedMatchData["Points if guessed red correctly"]}</label>
        </div>
					<div class="flex flex-col">
						<label class="text-xs font-semibold uppercase text-zinc-400 mb-1">GambleScout prediction</label>
						<select name="entry.908293542" class="bg-zinc-800 border border-zinc-700 rounded p-2 outline-none">
							<option value="b">Blue Alliance</option>
							<option value="r">Red Alliance</option>
						</select>
					</div>
			</div>
        {/if}

			<!-- AUTONOMOUS -->
			<div class="mb-8">
				<h2 class="text-xl font-bold border-b border-zinc-700 pb-2 mb-4 text-green-400">AUTONOMOUS (HOLD ACTIONS)</h2>
				
				<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
					{#each [
						['auto_score', 'SCORING', 'bg-green-600'],
						['auto_pass', 'PASSING', 'bg-orange-600'],
						['auto_outpost', 'OUTPOST COLL', 'bg-blue-600'],
						['auto_depot', 'DEPOT COLL', 'bg-blue-600'],
						['auto_ground', 'GROUND COLL', 'bg-blue-600'],
						['auto_climb', 'CLIMBING', 'bg-purple-600'],
						['auto_trench', 'TRENCH', 'bg-zinc-700'],
						['auto_faff', 'FAFFING', 'bg-red-600']
					] as [code, label, color]}
						<button type="button" 
							class="p-4 rounded-lg font-bold text-[10px] shadow-lg active:scale-95 transition leading-tight {activeActions.has(code) ? `${color} text-white` : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}"
							on:mousedown={() => startAction(code)} on:mouseup={() => stopAction(code)}
							on:touchstart|preventDefault={() => startAction(code)} on:touchend|preventDefault={() => stopAction(code)}>
							{label}
						</button>
					{/each}
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
					<div class="flex flex-col">
						<label class="text-xs font-semibold uppercase text-zinc-400 mb-1">Auto Climb Result</label>
						<select name="entry.287801541" class="bg-zinc-800 border border-zinc-700 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none">
							<option value="No">No Climb</option>
							<option value="Out">Output Side</option>
							<option value="Mid">Middle</option>
							<option value="Dep">Depot Side</option>
							<option value="F">Failed Climb</option>
						</select>
					</div>
				</div>
			</div>

			<!-- TELEOP -->
			<div class="mb-8">
				<h2 class="text-xl font-bold border-b border-zinc-700 pb-2 mb-4 text-yellow-400">TELEOP (HOLD ACTIONS)</h2>
				
				<div class="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
					{#each [
						['tele_score', 'SCORING', 'bg-green-600'],
						['tele_coll', 'COLLECTING', 'bg-blue-600'],
						['tele_pass', 'PASSING', 'bg-orange-600'],
						['tele_faff', 'FAFFING', 'bg-red-600'],
						['tele_def', 'DEFENSE', 'bg-blue-900'],
						['tele_climb', 'CLIMBING', 'bg-purple-600'],
						['tele_alliance', 'ALLIANCE ZONE', 'bg-blue-500'],
						['tele_neutral', 'NEUTRAL ZONE', 'bg-zinc-500'],
						['tele_opponent', 'OPPONENT ZONE', 'bg-red-900']
					] as [code, label, color]}
						<button type="button" 
							class="p-4 rounded-lg font-bold text-[10px] shadow-lg active:scale-95 transition leading-tight {activeActions.has(code) ? `${color} text-white` : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}"
							on:mousedown={() => startAction(code)} on:mouseup={() => stopAction(code)}
							on:touchstart|preventDefault={() => startAction(code)} on:touchend|preventDefault={() => stopAction(code)}>
							{label}
						</button>
					{/each}
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
					<label class="flex items-center space-x-3 bg-zinc-800 p-4 rounded border-2 border-zinc-700 cursor-pointer hover:bg-zinc-700 transition">
						<input type="checkbox" name="entry.901735072" value="true" class="w-6 h-6 rounded" />
						<span class="font-bold">Alliance won auto?</span>
					</label>
					<label class="flex items-center space-x-3 bg-zinc-800 p-4 rounded border-2 border-zinc-700 cursor-pointer hover:bg-zinc-700 transition">
						<input type="checkbox" name="entry.942649623" value="true" class="w-6 h-6 rounded" />
						<span class="font-bold">Defended by opponent?</span>
					</label>
				</div>
			</div>

			<!-- ENDGAME -->
			<div class="mb-8">
				<h2 class="text-xl font-bold border-b border-zinc-700 pb-2 mb-4 text-purple-400">ENDGAME</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
					<div class="flex flex-col">
						<label class="text-xs font-semibold uppercase text-zinc-400 mb-1">Climb Level</label>
						<select name="entry.477247024" class="bg-zinc-800 border border-zinc-700 rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none">
							<option value="No">No Climb</option>
							<option value="L1">Level 1</option>
							<option value="L2">Level 2</option>
							<option value="L3">Level 3</option>
							<option value="F">Failed Climb</option>
						</select>
					</div>
					<div class="flex flex-col">
						<label class="text-xs font-semibold uppercase text-zinc-400 mb-1">Climb Position</label>
						<select name="entry.1268059521" class="bg-zinc-800 border border-zinc-700 rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none">
							<option value="No">No Climb</option>
							<option value="Out">Output Side</option>
							<option value="Mid">Middle</option>
							<option value="Dep">Depot Side</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
					<label class="flex items-center space-x-3 bg-zinc-800 p-2 rounded border border-zinc-700 cursor-pointer hover:bg-zinc-700 transition">
						<input type="checkbox" name="entry.676569017" value="true" class="w-4 h-4 rounded" />
						<span class="text-sm">Mech Issue</span>
					</label>
					<label class="flex items-center space-x-3 bg-zinc-800 p-2 rounded border border-zinc-700 cursor-pointer hover:bg-zinc-700 transition">
						<input type="checkbox" name="entry.1940984634" value="true" class="w-4 h-4 rounded" />
						<span class="text-sm">Died</span>
					</label>
					<label class="flex items-center space-x-3 bg-zinc-800 p-2 rounded border border-zinc-700 cursor-pointer hover:bg-zinc-700 transition">
						<input type="checkbox" name="entry.1961795439" value="true" class="w-4 h-4 rounded" />
						<span class="text-sm">Tipped</span>
					</label>
				</div>
			</div>

			<!-- POSTMATCH -->
			<div class="mb-8">
				<h2 class="text-xl font-bold border-b border-zinc-700 pb-2 mb-4 text-zinc-400">POST-MATCH</h2>
				
				<div class="space-y-6">
					<div class="flex flex-col">
						<div class="flex justify-between mb-1">
							<label class="text-xs font-semibold uppercase text-zinc-400">Scoring Effectiveness</label>
							<span class="text-xs font-bold text-blue-400">{scoringEff}/5</span>
						</div>
						<input type="range" name="entry.975098497" min="0" max="5" bind:value={scoringEff} class="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
					</div>

					<div class="flex flex-col">
						<label class="text-xs font-semibold uppercase text-zinc-400 mb-1">Scored How?</label>
						<select name="entry.1864643366" class="bg-zinc-800 border border-zinc-700 rounded p-2 outline-none">
							<option value="blank">(blank)</option>
							<option value="driving">While driving</option>
							<option value="stationary">While stationary</option>
							<option value="both">Both</option>
							<option value="none">No scoring</option>
						</select>
					</div>

					<div class="mb-6">
						<p class="text-xs font-semibold uppercase text-zinc-400 mb-2 tracking-wide">Scoring Locations</p>
						<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
							{#each [['Outpost Trench', '1'], ['Outpost', '2'], ['Hub', '3'], ['Ladder', '4'], ['Depot', '5'], ['Depot Trench', '6']] as [label, val]}
								<label class="flex items-center space-x-3 bg-zinc-800 p-2 rounded border border-zinc-700 cursor-pointer hover:bg-zinc-700 transition">
									<input type="checkbox" name="entry.728375142" value={val} class="w-4 h-4 rounded" />
									<span class="text-xs">{label}</span>
								</label>
							{/each}
						</div>
					</div>

					<div class="flex flex-col">
						<div class="flex justify-between mb-1">
							<label class="text-xs font-semibold uppercase text-zinc-400">Feeding Skill</label>
							<span class="text-xs font-bold text-orange-400">{feedingSkill}/5</span>
						</div>
						<input type="range" name="entry.2132357592" min="0" max="5" bind:value={feedingSkill} class="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
					</div>

					<div class="flex flex-col">
						<label class="text-xs font-semibold uppercase text-zinc-400 mb-1">Passed How?</label>
						<select name="entry.788387708" class="bg-zinc-800 border border-zinc-700 rounded p-2 outline-none">
							<option value="blank">(blank)</option>
							<option value="driving">While driving</option>
							<option value="stationary">While stationary</option>
							<option value="both">Both</option>
							<option value="none">No Passing</option>
						</select>
					</div>

					<div class="flex flex-col">
						<div class="flex justify-between mb-1">
							<label class="text-xs font-semibold uppercase text-zinc-400">Defense Skill</label>
							<span class="text-xs font-bold text-red-400">{defSkill}/5</span>
						</div>
						<input type="range" name="entry.1384370540" min="0" max="5" bind:value={defSkill} class="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
					</div>

					<div class="flex flex-col">
						<label class="text-xs font-semibold uppercase text-zinc-400 mb-1">Card</label>
						<select name="entry.1816355809" class="bg-zinc-800 border border-zinc-700 rounded p-2 outline-none">
							<option value="No Card">No Card</option>
							<option value="Yellow">Yellow Card</option>
							<option value="Red">Red Card</option>
						</select>
					</div>

					<div class="flex flex-col">
						<label class="text-xs font-semibold uppercase text-zinc-400 mb-1 tracking-wide">Comments</label>
            <p class="text-s">Please fill this section out, while not explicitly required, we do read every comment when making decisions about a given team. This is the best way you have to describe any qualitative nuances found within any robot</p>
						<textarea
						  rows="4"
						  name="entry.568874806"
						  class="bg-zinc-800 border border-zinc-700 rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
						  placeholder="General observations..."
              required
						></textarea>					</div>
				</div>
			</div>

			<button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg shadow-lg transition transform active:scale-95 mb-12">
				SUBMIT DATA
			</button>
		</form>
	</div>
</div>

<Footer />

<style>
	input[type='range']::-webkit-slider-thumb {
		appearance: none;
		width: 20px;
		height: 20px;
		background: #3b82f6;
		border-radius: 50%;
		cursor: pointer;
	}
	input[type='range']::-moz-range-thumb {
		width: 20px;
		height: 20px;
		background: #3b82f6;
		border-radius: 50%;
		cursor: pointer;
	}
</style>
