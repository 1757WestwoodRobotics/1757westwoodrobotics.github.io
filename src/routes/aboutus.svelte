<script>
	import Navbar from '../components/navbar.svelte';
	import Footer from '../components/footer.svelte';
</script>

<svelte:head>
    <title>About Us</title>
</svelte:head>

<Navbar />

<div
	class="max-w-full bg-[#115724] h-screen min-h-5 align-center bg-[url('/img/team_bg.jpg')] bg-center bg-cover bg-blend-multiply text-white text-center flex items-center justify-center"
>
	<div class="flex mx-4">
		<span class="shrink basis-1/3 flex hidden sm:block"> <img src="/favicon.png" /></span>
		<div class="text-center basis-auto sm:basis-2/3">
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
<div class="max-w-full h-[70vh] bg-[url('/img/robot_pic.png')] min-h-5 bg-center bg-cover">
	<div
		class="text-white flex items-center justify-center text-center align-center h-full text-lg px-10 backdrop-blur-sm w-full"
	>
		<div class="flex items-center justify-center align-center">
			<p class="basis-1 grow">
				Affiliated with the Westwood High School as a club, FRC Team 1757 looks to give back to the
				community by introducing young students to robot design, programming, and other STEAM
				skills.
			</p>
			<p class="basis-1 grow">
				We participate in the FIRST Robotics Competition. FIRST, “For Inspiration and Recognition of
				Science and Technology”, is a foundation whose mission is to inspire young people to become
				science and technology leaders by engaging them in exciting mentor-based programs that build
				science, engineering, and technology skills.
			</p>
		</div>
	</div>
</div>
<div
	class="max-w-full h-[70vh] bg-blend-multiply bg-slate-300 bg-[url('/img/coolio.png')] min-h-5 bg-center bg-cover"
>
	<div
		class="h-full w-full flex items-center justify-center align-center backdrop-blur-sm text-white text-center px-6 gap-7"
	>
		<span class="basis-2/3">
			<h4 class="text-3xl">What if FRC?</h4>
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
<div class="max-w-full h-[80vh] bg-[url('/img/dcmp_team.jpg')] min-h-5 bg-center bg-cover">
    <span class="h-full w-full flex backdrop-blur text-white flex align-center justify-center items-center flex-col gap-4">
        <h2 class="text-3xl"><b>Meet the team</b></h2>
        <div class="flex justify-around text-center flex-wrap gap-5">
            <div class="flex justify-center align-center items-center flex-col gap-5">
                <img src="/img/team/charley.jpg" class="rounded-full aspect-square ring-4 w-32 ring-red-800"/>
                <b>Charley Marsland</b>
                Captin
            </div>
            <div class="flex justify-center align-center items-center flex-col gap-5">
                <img src="/img/team/luke.png" class="rounded-full aspect-square ring-4 w-32"/>
                <b>Luke Maxwell</b>
                Vice Captain, Technical Lead
            </div>
        </div>
    </span>
</div>
<Footer />
