<script>
	import Navbar from '../components/navbar.svelte';
	import Footer from '../components/footer.svelte';
</script>

<svelte:head>
	<title>About Us</title>
	<meta name="description" content="About team 1757" />
	<meta name="keywords" content="FRC, FIRST, Robotics" />
	<meta name="author" content="Westwood Robotics" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta property="og:title" content="About Westwood Robotics team 1757" />
	<meta
		property="og:description"
		content="Information regarding the formation and current status of the team"
	/>
	<meta property="og:image" content="https://whsrobotics.org/favicon.png" />
</svelte:head>

<Navbar />

<div
	class="max-w-full bg-[#115724] h-screen min-h-5 align-center bg-[url('/img/team_bg.jpg')] bg-center bg-cover bg-blend-multiply text-white text-center flex items-center justify-center"
>
	<div class="flex mx-4">
		<span class="shrink basis-1/3 flex hidden sm:block"> <img src="/favicon.png" /></span>
		<div
			class="text-center basis-auto sm:basis-2/3 flex flex-col align-center justify-center items-center"
		>
			<h2 class="text-5xl"><i><b>THIS</b></i> is 1757</h2>
			<br />
			<h6>
				Founded in 2006, we are a team of students and mentors from Westwood High School who are
				passionate about robotics. Skillful mentors work side-by-side with students to help foster
				the next generation of scientists, engineers, software developers, and business
				entrepreneurs.
			</h6>
		</div>
	</div>
</div>
<div class="max-w-full h-[70vh] min-h-5 bg-center bg-cover relative -z-20 bg-slate-500">
	<img
		class="w-full h-full blur-sm inline-block -z-10 object-cover object-center block absolute top-1/2 -translate-x-2/4 -translate-y-2/4 left-1/2"
		src="/img/robot_pic.png"
	/>
	<div
		class="text-white flex items-center justify-center text-center align-center h-full text-lg w-full inline-block"
	>
		<div class="flex items-center justify-around align-center px-4 gap-4">
			<p class="basis-1 grow">
				Affiliated with the Westwood High School as a club, FRC Team 1757 looks to give back to the
				community by introducing young students to robot design, programming, and other STEAM
				skills.
			</p>
			<p class="basis-1 grow">
				We participate in the FIRST Robotics Competition. <i>FIRST</i>, “For Inspiration and
				Recognition of Science and Technology”, is a foundation whose mission is to inspire young
				people to become science and technology leaders by engaging them in exciting mentor-based
				programs that build science, engineering, and technology skills.
			</p>
		</div>
	</div>
</div>
<div class="max-w-full h-[70vh] min-h-5 relative -z-20 bg-slate-500 relative bg-cover bg-center">
	<img
		class="w-full h-full blur-sm inline-block -z-10 object-cover object-center block absolute top-1/2 -translate-x-2/4 -translate-y-2/4 left-1/2"
		src="/img/coolio.png"
	/>
	<div
		class="h-full w-full flex items-center justify-center align-center text-white text-center px-6 gap-7 inline-block"
	>
		<span class="basis-2/3">
			<h4 class="text-3xl mb-5">What is FRC?</h4>
			<p>
				<i>FIRST</i> Robotics Competition (FRC) is an international high school robotics competition.
				Each year teams obtain new game details in the beginning of January; they are given six weeks
				to construct and test their robot that can operate both autonomously and remotely.
			</p>
		</span>
		<span
			class="basis-1/3 aspect-square p-2 rounded bg-white flex align-center items-center justify-center"
		>
			<img src="/img/frc_logo.jpg" />
		</span>
	</div>
</div>
<div class="max-w-full min-h-5 bg-center bg-cover relative bg-slate-500 -z-20">
	<img
		class="w-full h-full blur-sm inline-block -z-10 object-cover object-center block absolute top-1/2 -translate-x-2/4 -translate-y-2/4 left-1/2"
		src="/img/dcmp_team.jpg"
	/>
	<span
		class="h-full w-full flex backdrop-blur text-white flex align-center justify-center items-center flex-col gap-4 py-10"
	>
		<h2 class="text-3xl"><b>Meet the team</b></h2>
		<h3 class="text-xl">E-Board</h3>
		<div
			class="flex justify-around text-center flex-wrap gap-5 mx-10 w-full max-w-screen-sm items-start"
		>
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/landon.webp"
					class="rounded-full aspect-square ring-4 w-32 ring-red-800 mb-5"
				/>
				<b>Landon Bayer</b>
				Technical Captain
			</div>
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/anya.webp"
					class="rounded-full aspect-square ring-4 w-32 mb-5 ring-green-800"
				/>
				<b>Anya Jiang</b>
				Technical Vice Captain
			</div>
			<div class="flex justify-center align-center items-center flex-col">
				<img src="/img/team/claire.webp" class="rounded-full aspect-square ring-4 w-32 mb-5" />
				<b>Claire Peng</b>
				Business Captain
			</div>
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/elizabeth.webp"
					class="rounded-full aspect-square ring-4 w-32 mb-5 ring-orange-400"
				/>
				<b>Elizabeth Lowney</b>
				Business Vice Captain
			</div>
		</div>
		<br />
		<h3 class="text-xl">Mentors</h3>
		<div
			class="flex justify-around text-center flex-wrap gap-5 mx-10 w-full max-w-screen-sm items-start"
		>
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/chris.webp"
					class="rounded-full aspect-square ring-4 w-32 ring-emerald-600 mb-5"
				/>
				<b>Chris Aloisio</b>
				Lead Mentor<br/> 
			</div>
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/steven.webp"
					class="rounded-full aspect-square ring-4 w-32 ring-rose-800 mb-5"
				/>
				<b>Steven Harrington</b>
				Mechanical Mentor<br />Business Mentor
			</div>
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/dwight.webp"
					class="rounded-full aspect-square ring-4 w-32 ring-cyan-600 mb-5"
				/>
				<b>Dwight Meglan</b>
				Mentor
			</div>
		</div>
		<br />
		<h3 class="text-xl">Other Leadership</h3>
		<div
			class="flex justify-around text-center flex-wrap gap-5 mx-10 w-full max-w-screen-sm items-start"
		>
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/ivan.webp"
					class="rounded-full aspect-square ring-4 w-32 rotate-6 ring-fuchsia-800 mb-5"
				/>
				<b>Ivan Cai</b>
				Programming Lead
			</div>
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/jacob.webp"
					class="rounded-full aspect-square ring-4 w-32 rotate-6 ring-cyan-800 mb-5"
				/>
				<b>Jacob Kaplan</b>
				Design Lead
			</div>
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/alex.webp"
					class="rounded-full aspect-square ring-4 w-32 rotate-6 ring-orange-800 mb-5"
				/>
				<b>Alex Theofilou</b>
				Outreach Lead
			</div>
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/celina.webp"
					class="rounded-full aspect-square ring-4 w-32 rotate-6 ring-blue-800 mb-5"
				/>
				<b>Celina Yau</b>
				Media Lead
			</div>

			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/blank.webp"
					class="rounded-full aspect-square ring-4 w-32 rotate-6 ring-green-800 mb-7"
				/>
				<b>Julian Saroufim</b>
				Finance Co-Lead
			</div>
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/constantina.webp"
					class="rounded-full aspect-square ring-4 w-32 rotate-6 ring-cyan-800 mb-7"
				/>
				<b>Constantina Flevarakis</b>
				Finance Co-Lead
			</div>
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/yuhan.webp"
					class="rounded-full aspect-square ring-4 w-32 rotate-6 ring-pink-800 mb-7"
				/>
				<b>Yuhan Chen</b>
				Open Alliance Lead
			</div>
		</div>
	</span>
</div>
<Footer />
