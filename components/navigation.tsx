"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CartSheet } from "@/components/cart-sheet"

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAtTop, setIsAtTop] = useState(true)
  const pathname = usePathname()

  // Only use transparent nav on homepage
  const isHomePage = pathname === "/"

  useEffect(() => {
    const handleScroll = () => {
      // Only transparent when at the very top
      setIsAtTop(window.scrollY < 50)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isHomePage && isAtTop ? "bg-transparent" : "bg-background/95 backdrop-blur-md shadow-sm"
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-28">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className={`font-serif text-5xl font-bold transition-colors ${isHomePage && isAtTop ? "text-white" : "text-primary"}`}>
              Sunville Bakery
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={`transition-colors font-semibold text-xl ${
                isHomePage && isAtTop ? "text-white hover:text-accent" : "text-foreground hover:text-accent"
              }`}
            >
              Home
            </Link>
            <Link
              href="/#about"
              className={`transition-colors font-semibold text-xl ${
                isHomePage && isAtTop ? "text-white hover:text-accent" : "text-foreground hover:text-accent"
              }`}
            >
              About
            </Link>
            <Link
              href="/menu"
              className={`transition-colors font-semibold text-xl ${
                isHomePage && isAtTop ? "text-white hover:text-accent" : "text-foreground hover:text-accent"
              }`}
            >
              Menu
            </Link>
            <Link
              href="/gallery"
              className={`transition-colors font-semibold text-xl ${
                isHomePage && isAtTop ? "text-white hover:text-accent" : "text-foreground hover:text-accent"
              }`}
            >
              Gallery
            </Link>
            <Link
              href="/#contact"
              className={`transition-colors font-semibold text-xl ${
                isHomePage && isAtTop ? "text-white hover:text-accent" : "text-foreground hover:text-accent"
              }`}
            >
              Contact
            </Link>
            <Button
              asChild
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Link href="/menu">Order Now</Link>
            </Button>
            <CartSheet />
          </div>

          {/* Mobile Menu Button & Cart */}
          <div className="md:hidden flex items-center gap-2">
            <CartSheet />
            <button
              className={`p-2 rounded-lg transition-all ${
                isMobileMenuOpen
                  ? "bg-accent text-accent-foreground"
                  : isHomePage && isAtTop
                    ? "text-white hover:bg-white/10"
                    : "text-foreground hover:bg-gray-100"
              }`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-6 border-t border-border bg-background/95 backdrop-blur-md">
            <div className="flex flex-col gap-2">
              <Link
                href="/"
                className="text-center text-foreground hover:bg-accent/10 hover:text-accent transition-all font-semibold text-lg py-3 px-4 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/#about"
                className="text-center text-foreground hover:bg-accent/10 hover:text-accent transition-all font-semibold text-lg py-3 px-4 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/menu"
                className="text-center text-foreground hover:bg-accent/10 hover:text-accent transition-all font-semibold text-lg py-3 px-4 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Menu
              </Link>
              <Link
                href="/gallery"
                className="text-center text-foreground hover:bg-accent/10 hover:text-accent transition-all font-semibold text-lg py-3 px-4 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Gallery
              </Link>
              <Link
                href="/#contact"
                className="text-center text-foreground hover:bg-accent/10 hover:text-accent transition-all font-semibold text-lg py-3 px-4 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact
              </Link>
              <Button
                asChild
                className="bg-accent text-accent-foreground hover:bg-accent/90 mt-2 text-lg py-6"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Link href="/menu">Order Now</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
