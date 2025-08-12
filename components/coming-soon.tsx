import { motion, Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      // 'type' must be a specific value, not generic string
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
      delayChildren: 0.2,
      staggerChildren: 0.15,
    },
  },
};

const childVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ComingSoonPage({
  shouldReduceMotion,
}: {
  shouldReduceMotion: boolean;
}) {
  return (
    <>
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-black  to-gray-900 px-6 py-12">
        <motion.section
          initial={shouldReduceMotion ? false : "hidden"}
          animate="visible"
          variants={containerVariants}
          className="flex flex-col justify-center space-y-6 text-center md:text-left"
        >
          <motion.h1
            variants={childVariants}
            className="text-7xl font-bold leading-tight"
          >
            <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              Coming Soon
            </span>
          </motion.h1>

          <motion.p
            variants={childVariants}
            className="text-muted-foreground text-lg max-w-md mx-auto md:mx-0"
          >
            TurfBuddies is warming up — the pitch is almost perfect.
          </motion.p>
        </motion.section>
      </main>
    </>
  );
}
