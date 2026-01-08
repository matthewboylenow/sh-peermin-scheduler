import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, FileText, Bell, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-navy to-navy-dark py-20 md:py-28">
          <Container>
            <div className="text-center">
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                Saint Helen Peer Ministry
              </h1>
              <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto mb-8">
                Empowering young people to serve and lead in our faith community.
                Access schedules, manage assignments, and stay connected.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  asChild
                  size="lg"
                  variant="accent"
                  className="group"
                >
                  <Link href="/schedule">
                    View Schedule
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-white text-white hover:bg-white hover:text-navy"
                >
                  <Link href="/login">Peer Minister Login</Link>
                </Button>
              </div>
            </div>
          </Container>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-20 bg-cream">
          <Container>
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-navy mb-4">
                How It Works
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Our scheduling platform makes it easy to coordinate peer ministry activities
                and keep everyone informed.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="hover:shadow-card-hover hover:-translate-y-1">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-navy/10 flex items-center justify-center mb-4">
                    <Calendar className="h-6 w-6 text-navy" />
                  </div>
                  <CardTitle className="text-xl">View Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Access the complete ministry schedule and see all upcoming events at a glance.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-card-hover hover:-translate-y-1">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-rust/10 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-rust" />
                  </div>
                  <CardTitle className="text-xl">My Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Peer ministers can log in to see their personal schedule and upcoming commitments.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-card-hover hover:-translate-y-1">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-success" />
                  </div>
                  <CardTitle className="text-xl">Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Access important files, training materials, and ministry resources anytime.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-card-hover hover:-translate-y-1">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center mb-4">
                    <Bell className="h-6 w-6 text-info" />
                  </div>
                  <CardTitle className="text-xl">Reminders</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Receive automatic SMS reminders before your scheduled ministry times.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </Container>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20 bg-white">
          <Container size="sm">
            <Card className="overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-navy to-rust" />
              <CardContent className="p-8 md:p-12 text-center">
                <h2 className="font-heading text-2xl md:text-3xl font-bold text-navy mb-4">
                  Ready to Serve?
                </h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  If you&apos;re a peer minister, log in to view your schedule and access resources.
                  New to the program? Contact the parish office to get involved.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild>
                    <Link href="/login">Peer Minister Login</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/schedule">View Public Schedule</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  );
}
